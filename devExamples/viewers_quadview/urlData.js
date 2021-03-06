function setURLForData() {
    let t2 = [
        '36444280', '36444294', '36444308', '36444322', '36444336',
        '36444350', '36444364', '36444378', '36444392', '36444406',
        '36444490', '36444504', '36444518', '36444532', '36746856',
        '36746870', '36746884', '36746898', '36746912', '36746926',
        '36746940', '36746954', '36746968', '36746982', '36746996',
        '36747010', '36747024', '36748200', '36748214', '36748228',
        '36748270', '36748284', '36748298', '36748312', '36748326',
        '36748340', '36748354', '36748368', '36748382', '36748396',
        '36748410', '36748424', '36748438', '36748452', '36748466',
        '36748480', '36748494', '36748508', '36748522', '36748242',
        '36748256', '36444434', '36444448', '36444462', '36444476',
    ];

    let files = t2.map(function (v) {
        return 'https://cdn.rawgit.com/FNNDSC/data/master/dicom/adi_brain/' + v;
    });
    return files;
}

function setSTL3DSegmentationDataInfo() {
    let dataInfo = [
        ['adi1', {
            location:
                'https://cdn.rawgit.com/FNNDSC/data/master/dicom/adi_brain/mesh.stl',
            label: 'Left',
            loaded: false,
            material: null,
            materialFront: null,
            materialBack: null,
            mesh: null,
            meshFront: null,
            meshBack: null,
            color: 0xe91e63,
            opacity: 0.7,
        }],
        ['adi2', {
            location:
                'https://cdn.rawgit.com/FNNDSC/data/master/dicom/adi_brain/mesh2.stl',
            label: 'Right',
            loaded: false,
            material: null,
            materialFront: null,
            materialBack: null,
            mesh: null,
            meshFront: null,
            meshBack: null,
            color: 0x03a9f4,
            opacity: 1,
        }],
    ];
    return dataInfo;
}

export {setURLForData, setSTL3DSegmentationDataInfo};