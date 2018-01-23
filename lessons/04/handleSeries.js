

function handleSeries() {

    var mergedSeries = loader.data[0].mergeSeries(loader.data);
    var ctGrayImagesStack = mergedSeries[0].stack[0];
    var segmentationStack = mergedSeries[1].stack[0];
    loader.free();
    loader = null;

    var stackHelper = new AMI.StackHelper(ctGrayImagesStack);
    stackHelper.bbox.visible = false;
    stackHelper.border.visible = false;
    stackHelper.index = 10;

    sceneLayerCT.add(stackHelper);

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
    prepareStackToCreateLabelMap(segmentationStack);

    var textures2 = setRawTextureForLabelMap(segmentationStack);

    // create material && mesh then add it to sceneLayerSegmentation
    uniformShaderSegmentationLayer = AMI.DataUniformShader.uniforms();
    uniformShaderSegmentationLayer.uTextureSize.value = segmentationStack.textureSize;
    uniformShaderSegmentationLayer.uTextureContainer.value = textures2;
    uniformShaderSegmentationLayer.uWorldToData.value = segmentationStack.lps2IJK;
    uniformShaderSegmentationLayer.uNumberOfChannels.value = segmentationStack.numberOfChannels;
    uniformShaderSegmentationLayer.uPixelType.value = segmentationStack.pixelType;
    uniformShaderSegmentationLayer.uBitsAllocated.value = segmentationStack.bitsAllocated;
    uniformShaderSegmentationLayer.uWindowCenterWidth.value = [segmentationStack.windowCenter, segmentationStack.windowWidth];
    uniformShaderSegmentationLayer.uRescaleSlopeIntercept.value = [segmentationStack.rescaleSlope, segmentationStack.rescaleIntercept];
    uniformShaderSegmentationLayer.uDataDimensions.value = [segmentationStack.dimensionsIJK.x, segmentationStack.dimensionsIJK.y, segmentationStack.dimensionsIJK.z];
    uniformShaderSegmentationLayer.uInterpolation.value = 0;

    // generate shaders on-demand!
    var fs = new AMI.DataFragmentShader(uniformShaderSegmentationLayer);
    var vs = new AMI.DataVertexShader();
    materialLayer1 = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: uniformShaderSegmentationLayer,
        vertexShader: vs.compute(),
        fragmentShader: fs.compute(),
    });

    // add mesh in this scene with right shaders...
    meshLayer1 = new THREE.Mesh(stackHelper.slice.geometry, materialLayer1);
    // go the LPS space
    meshLayer1.applyMatrix(ctGrayImagesStack._ijk2LPS);
    sceneLayerSegmentation.add(meshLayer1);

    // Create the Mix layer
    uniformsLayerMix = AMI.LayerUniformShader.uniforms();
    uniformsLayerMix.uTextureBackTest0.value = sceneLayerCTTextureTarget.texture;
    uniformsLayerMix.uTextureBackTest1.value = sceneLayerSegmentationTextureTarget.texture;

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
    meshLayerMix.applyMatrix(ctGrayImagesStack._ijk2LPS);
    sceneLayerMix.add(meshLayerMix);

    //
    // set camera
    var worldbb = ctGrayImagesStack.worldBoundingBox();
    var lpsDims = new THREE.Vector3(worldbb[1] - worldbb[0], worldbb[3] - worldbb[2], worldbb[5] - worldbb[4]);

    // box: {halfDimensions, center}
    var box = {
        center: ctGrayImagesStack.worldCenter().clone(),
        halfDimensions: new THREE.Vector3(lpsDims.x + 10, lpsDims.y + 10, lpsDims.z + 10)
    };

    // init and zoom
    var canvas = {
        width: threeD.clientWidth,
        height: threeD.clientHeight,
    };
    camera.directions = [ctGrayImagesStack.xCosine, ctGrayImagesStack.yCosine, ctGrayImagesStack.zCosine];
    camera.box = box;
    camera.canvas = canvas;
    camera.update();
    camera.fitBox(2);

    // CREATE LUT
    const domTarget = 'my-lut-canvases-l0';
    const lut = 'default';
    const lut0 = 'linear';
    const color = [[0, 0, 0, 0], [1, 1, 1, 1]];
    const opacity = [[0, 1], [1, 1]];
    lutLayer0 = new AMI.LutHelper(
        domTarget,
        lut,
        lut0,
        color,
        opacity
    );
    lutLayer0.luts = AMI.LutHelper.presetLuts();

    const domTargetForSecondLayer = 'my-lut-canvases-l1';
    const segmentationLUT = segmentationStack.segmentationLUT;
    const segmentationLUTO = segmentationStack.segmentationLUTO;
    const discrete = true;
    lutLayer1 = new AMI.LutHelper(
        domTargetForSecondLayer,
        lut,
        lut0,
        segmentationLUT,
        segmentationLUTO,
        discrete
    );
    uniformShaderSegmentationLayer.uLut.value = 1;
    uniformShaderSegmentationLayer.uTextureLUT.value = lutLayer1.texture;

    buildGUI(stackHelper);
}