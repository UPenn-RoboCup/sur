document.addEventListener( "DOMContentLoaded", function(){

  var material = new THREE.MeshPhongMaterial({
    ambient: 0x555555, color: 0xAAAAAA, specular: 0x111111, shininess: 200
  });

  var parts_list = [
"CAM.stl",
"CHEST.stl",
"FOOT.stl",
"LEFT_ANKLE.stl",
"LEFT_ARM.stl",
"LEFT_ELBOW.stl",
"LEFT_GRIPPER.stl",
"LEFT_HIP_YAW.stl",
"LEFT_SHOULDER_PITCH.stl",
"L_LEG.stl",
"L_THIGH.stl",
"NECK.stl",
"PELVIS.stl",
"RIGHT_ARM.stl",
"RIGHT_ELBOW.stl",
"RIGHT_GRIPPER.stl",
"RIGHT_HIP_ROLL.stl",
"RIGHT_KNEE_PITCH.stl",
"RIGHT_SHOULDER_PITCH.stl",
"RIGHT_SHOULDER_ROLL.stl",
"RIGHT_WRIST.stl",
"R_LEG.stl",
"R_THIGH.stl",
"TORSO_PITCH_SERVO.stl"
  ];

  var cb = function ( event ) {
    var geometry = event.content;
    var mesh = new THREE.Mesh( geometry, material );

    mesh.position.set( 0, - 0.37, - 0.6 );
    mesh.rotation.set( - Math.PI / 2, 0, 0 );
    mesh.scale.set( 2, 2, 2 );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add( mesh );
  }

  for(var i=0;i<parts_list.length;i++){
    var loader = new THREE.STLLoader();
    loader.addEventListener( 'load', cb );
    loader.load( 'stl/'+parts_list[i] );
  }// for
});