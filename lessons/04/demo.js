/* globals Stats, dat, AMI*/

// standard global variables
var controls;
var renderer;
var camera;
var statsyay;
var threeD;
//
var sceneLayer0TextureTarget;
var sceneLayer1TextureTarget;
//
var sceneLayer0;
//
var lutLayer0;
var sceneLayer1;
var meshLayer1;
var uniformsLayer1;
var materialLayer1;
var lutLayer1;
var sceneLayerMix;
var meshLayerMix;
var uniformsLayerMix;
var materialLayerMix;

var layerMix = {
    opacity1: 1.0,
};

/**
 * Init the scene
 */
function init() {
    /**
   * Animation loop
   */
    function animate() {
        // render
        controls.update();
        // render first layer offscreen
        renderer.render(sceneLayer0, camera, sceneLayer0TextureTarget, true);
        // render second layer offscreen
        renderer.render(sceneLayer1, camera, sceneLayer1TextureTarget, true);
        // mix the layers and render it ON screen!
        renderer.render(sceneLayerMix, camera);
        statsyay.update();

        // request new frame
        requestAnimationFrame(function() {
            animate();
        });
    }

    // renderer
    setRenderer();

    // stats
    statsyay = new Stats();
    threeD.appendChild(statsyay.domElement);

    // scene
    sceneLayer0 = new THREE.Scene();
    sceneLayer1 = new THREE.Scene();
    sceneLayerMix = new THREE.Scene();

    // render to texture!!!!
    sceneLayer0TextureTarget = new THREE.WebGLRenderTarget(threeD.clientWidth, threeD.clientHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
    });

    sceneLayer1TextureTarget = new THREE.WebGLRenderTarget(threeD.clientWidth, threeD.clientHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
    });

    // camera
    setCamera();

    // controls
    setControls();

    animate();
}

// init threeJS...
init();

var files = setDicomDataUrl();

// load sequence for each file
// instantiate the loader
// it loads and parses the dicom image
var loader = new AMI.VolumeLoader(threeD);



/**
 * Handle series
 */
function handleSeries() {
    //
    //
    // first stack of first series
    var mergedSeries = loader.data[0].mergeSeries(loader.data);
    var stack = mergedSeries[0].stack[0];
    var stack2 = mergedSeries[1].stack[0];
    loader.free();
    loader = null;

    if (stack.modality === 'SEG') {
        stack = mergedSeries[0].stack[0];
        stack2 = mergedSeries[1].stack[0];
    }

    var stackHelper = new AMI.StackHelper(stack);
    stackHelper.bbox.visible = false;
    stackHelper.border.visible = false;
    stackHelper.index = 10;

    sceneLayer0.add(stackHelper);

    //
    //
    // create labelmap....
    // we only care about the geometry....
    // get first stack from series
    // prepare it
    // * ijk2LPS transforms
    // * Z spacing
    // * etc.
    //
    stack2.prepare();
    // pixels packing for the fragment shaders now happens there
    stack2.pack();

    var textures2 = [];
    for (var m = 0; m < stack2._rawData.length; m++) {
        var tex = new THREE.DataTexture(
            stack2.rawData[m],
            stack2.textureSize,
            stack2.textureSize,
            stack2.textureType,
            THREE.UnsignedByteType,
            THREE.UVMapping,
            THREE.ClampToEdgeWrapping,
            THREE.ClampToEdgeWrapping,
            THREE.NearestFilter,
            THREE.NearestFilter
        );
        tex.needsUpdate = true;
        tex.flipY = true;
        textures2.push(tex);
    }

    // create material && mesh then add it to sceneLayer1
    uniformsLayer1 = AMI.DataUniformShader.uniforms();
    uniformsLayer1.uTextureSize.value = stack2.textureSize;
    uniformsLayer1.uTextureContainer.value = textures2;
    uniformsLayer1.uWorldToData.value = stack2.lps2IJK;
    uniformsLayer1.uNumberOfChannels.value = stack2.numberOfChannels;
    uniformsLayer1.uPixelType.value = stack2.pixelType;
    uniformsLayer1.uBitsAllocated.value = stack2.bitsAllocated;
    uniformsLayer1.uWindowCenterWidth.value = [stack2.windowCenter, stack2.windowWidth];
    uniformsLayer1.uRescaleSlopeIntercept.value = [stack2.rescaleSlope, stack2.rescaleIntercept];
    uniformsLayer1.uDataDimensions.value = [stack2.dimensionsIJK.x, stack2.dimensionsIJK.y, stack2.dimensionsIJK.z];
    uniformsLayer1.uInterpolation.value = 0;

    // generate shaders on-demand!
    var fs = new AMI.DataFragmentShader(uniformsLayer1);
    var vs = new AMI.DataVertexShader();
    materialLayer1 = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: uniformsLayer1,
        vertexShader: vs.compute(),
        fragmentShader: fs.compute(),
    });

    // add mesh in this scene with right shaders...
    meshLayer1 = new THREE.Mesh(stackHelper.slice.geometry, materialLayer1);
    // go the LPS space
    meshLayer1.applyMatrix(stack._ijk2LPS);
    sceneLayer1.add(meshLayer1);

    // Create the Mix layer
    uniformsLayerMix = AMI.LayerUniformShader.uniforms();
    uniformsLayerMix.uTextureBackTest0.value = sceneLayer0TextureTarget.texture;
    uniformsLayerMix.uTextureBackTest1.value = sceneLayer1TextureTarget.texture;

    let fls = new AMI.LayerFragmentShader(uniformsLayerMix);
    let vls = new AMI.LayerVertexShader();
    materialLayerMix = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: uniformsLayerMix,
        vertexShader: vls.compute(),
        fragmentShader: fls.compute(),
        transparent: true,
    });

    // add mesh in this scene with right shaders...
    meshLayerMix = new THREE.Mesh(stackHelper.slice.geometry, materialLayer1);
    // go the LPS space
    meshLayerMix.applyMatrix(stack._ijk2LPS);
    sceneLayerMix.add(meshLayerMix);

    //
    // set camera
    var worldbb = stack.worldBoundingBox();
    var lpsDims = new THREE.Vector3(worldbb[1] - worldbb[0], worldbb[3] - worldbb[2], worldbb[5] - worldbb[4]);

    // box: {halfDimensions, center}
    var box = {
        center: stack.worldCenter().clone(),
        halfDimensions: new THREE.Vector3(lpsDims.x + 10, lpsDims.y + 10, lpsDims.z + 10)
    };

    // init and zoom
    var canvas = {
        width: threeD.clientWidth,
        height: threeD.clientHeight,
    };
    camera.directions = [stack.xCosine, stack.yCosine, stack.zCosine];
    camera.box = box;
    camera.canvas = canvas;
    camera.update();
    camera.fitBox(2);

    // CREATE LUT
    lutLayer0 = new AMI.LutHelper(
        'my-lut-canvases-l0',
        'default',
        'linear',
        [[0, 0, 0, 0], [1, 1, 1, 1]],
        [[0, 1], [1, 1]]
    );
    lutLayer0.luts = AMI.LutHelper.presetLuts();

    lutLayer1 = new AMI.LutHelper(
        'my-lut-canvases-l1',
        'default',
        'linear',
        stack2.segmentationLUT,
        stack2.segmentationLUTO,
        true
    );
    uniformsLayer1.uLut.value = 1;
    uniformsLayer1.uTextureLUT.value = lutLayer1.texture;

    buildGUI(stackHelper);
}

loader
    .load(files)
    .then(function() {
        handleSeries();
    })
    .catch(function(error) {
        window.console.log('oops... something went wrong...');
        window.console.log(error);
    });
