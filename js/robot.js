/*****
 * Mesh object for buttons and data associated with robot meshes
 */
(function(ctx){
  
  // Object to hold our various setup/interaction methods from main.js
  function Robot(){}
  
  var n_loaded = 0, nstl = 0;
  var is_loaded_cb, is_loaded = false;
  Robot.meshes = [];
  
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
      p: new THREE.Vector3(0, 0, 24),
      q: new THREE.Quaternion(0,0,0,1)}
    ]
  }
  skeleton.children.push(larm_chain);
  
  var material = new THREE.MeshPhongMaterial({
    ambient: 0x555555, color: 0xAAAAAA, specular: 0x111111, shininess: 200
  });
  
  var cb = function ( event ) {
    n_loaded++;
    var geometry = event.content;
    var mesh = new THREE.Mesh( geometry, material );

    this.root.mesh = mesh;
    Robot.meshes.push(mesh);

    if(n_loaded==n_stl && is_loaded_cb!==undefined){
      is_loaded = true;
      is_loaded_cb();
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

  var update_skeleton = function(root){
    if(root===undefined){root=skeleton;}
    // update the transform
    var chain_tr = new THREE.Matrix4();
    chain_tr.makeRotationFromQuaternion(root.q).setPosition(root.p);
    
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
  
  
  Robot.setup = function(cb){
    is_loaded_cb = cb;
    n_stl = load_skeleton(skeleton)
  }
  
  Robot.update_skeleton = update_skeleton;

  // export
	ctx.Robot = Robot;

})(this);

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