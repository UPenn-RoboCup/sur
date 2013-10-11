// Skeleton
var skeleton = {
  q: new THREE.Quaternion(0,0,0,1),
  p: new THREE.Vector3(0, 1155, 0),
  children: []
};
var neck_chain = {
  stl: 'NECK',
  q: new THREE.Quaternion(0,0,0,1),
  p: new THREE.Vector3(0, 50, 0),
  children: [
    {stl: 'CAM',
    p: new THREE.Vector3(0, 161, 0),
    q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(-1,0,0)), -0.17 ) }
  ]
}
skeleton.children.push(neck_chain);
//
var larm_chain = {
  stl: 'RIGHT_SHOULDER_PITCH',
  q: new THREE.Quaternion(0,0,0,1),
  p: new THREE.Vector3(50, 0, 0),
  children: [
    {stl: 'RIGHT_SHOULDER_ROLL',
    p:new THREE.Vector3(0, 0, 24),
    q: new THREE.Quaternion(0,0,0,1)}
  ]
}
skeleton.children.push(larm_chain);

document.addEventListener( "DOMContentLoaded", function(){

  var material = new THREE.MeshPhongMaterial({
    ambient: 0x555555, color: 0xAAAAAA, specular: 0x111111, shininess: 200
  });
/*
  var parts_list = [
"CAM",
"CHEST",
"FOOT",
"LEFT_ANKLE",
"LEFT_ARM",
"LEFT_ELBOW",
"LEFT_GRIPPER",
"LEFT_HIP_YAW",
"LEFT_SHOULDER_PITCH",
"L_LEG",
"L_THIGH",
"NECK",
"PELVIS",
"RIGHT_ARM",
"RIGHT_ELBOW",
"RIGHT_GRIPPER",
"RIGHT_HIP_ROLL",
"RIGHT_KNEE_PITCH",
"RIGHT_SHOULDER_PITCH",
"RIGHT_SHOULDER_ROLL",
"RIGHT_WRIST",
"R_LEG",
"R_THIGH",
"TORSO_PITCH_SERVO"
  ];
*/
  var cb = function ( event ) {
    n_loaded++;
    //console.log( this.root, n_loaded );
    var geometry = event.content;
    var mesh = new THREE.Mesh( geometry, material );

    //mesh.position.set( 0, bodyHeight*1000, 0 );
    //mesh.position.getPositionFromMatrix(this.root.tr);
    //mesh.rotation.set( - Math.PI / 2, 0, 0 );
    //mesh.scale.set( 2, 2, 2 );

    //mesh.castShadow = true;
    //mesh.receiveShadow = true;

    scene.add( mesh );
    this.root.mesh = mesh;

    if(n_loaded==n_stl){
      console.log('STL files Loaded!');
      update_skeleton(skeleton);
      render();
    }
    
  }

  var load_skeleton = function(root){
    // load self
    var loader = new THREE.STLLoader();
    var name = root.stl;
    var n_stl = 0;
    if(name!==undefined){
      n_stl++;
      loader.addEventListener( 'load', cb.bind({root: root}) );
      loader.load( 'stl/'+name+'.stl' );
    }
    if(root.children===undefined){return n_stl;}
    // load children
    for(var c=0;c<root.children.length;c++){
      root.children[c].parent = root;
      n_stl+=load_skeleton(root.children[c]);
    }
    return n_stl;
  }
  var n_loaded = 0;
  var n_stl = load_skeleton(skeleton);

  var update_skeleton = function(root){

    // update the transform
    var chain_tr = new THREE.Matrix4();
    chain_tr.compose(root.p,root.q,1);
    if(root.parent!==undefined){
      chain_tr.multiply( root.parent.chain_tr );
    }

    // update the transform of the mesh
    var mesh = root.mesh;
    if(mesh!==undefined){
      mesh.position.getPositionFromMatrix(chain_tr);
    }

    // Save the chain'd tr
    root.chain_tr = chain_tr;

    if(root.children===undefined){return;}
    // transform children
    for(var c=0;c<root.children.length;c++){
      update_skeleton(root.children[c]);
    }
  } // update skeleton

});