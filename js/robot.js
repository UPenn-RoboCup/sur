/*****
 * Mesh object for buttons and data associated with robot meshes
 */
(function(ctx){
  
  // Object to hold our various setup/interaction methods from main.js
  function Robot(){}
  
  /* robot bodyHeight, but this can change a LOT */
  Robot.bodyTilt = 11*Math.PI/180;
  Robot.bodyHeight = 0.9285318;
  Robot.supportX = 0.0515184;
  // pose
  Robot.px = 0;
  Robot.py = 0;
  Robot.pa = 0;
  
  var n_loaded = 0, nstl = 0;
  var is_loaded_cb, is_loaded = false;
  Robot.meshes = [];
  
  var shown = true;
  
  // Skeleton
  var skeleton = {
    stl: 'CHEST',
    q: new THREE.Quaternion(0,0,0,1),
    p: new THREE.Vector3(0, 1155, 0),
    children: [
    ]
  };
  var neck_chain = {
    stl: 'NECK',
    q: new THREE.Quaternion(0,0,0,1),
    p: new THREE.Vector3(0, 50, 0),
    children: [
      {stl: 'CAM',
      p: new THREE.Vector3(0, 111, 0),
      q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(-1,0,0)), -0.17 ) }
    ]
  }
  skeleton.children.push(neck_chain);
  //
  var rarm_chain = {
    stl: 'RIGHT_SHOULDER_PITCH',
    p: new THREE.Vector3(-184, -8, 0),
    q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,0,1)), -1.5708 ),
    children: [
      {stl: 'RIGHT_SHOULDER_ROLL',
      p: new THREE.Vector3(0, -50, 24),
      q: new THREE.Quaternion(0,0,0,1),
      children: [
        {// yaw
        p: new THREE.Vector3(0, 0, 0),
        q: new THREE.Quaternion(0,0,0,1),
        children: [
          {stl: 'RIGHT_ARM',
          p: new THREE.Vector3(0, -27, -24),
          q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,1,0)), 3.14159 ),
          children: [
            {stl: 'RIGHT_ELBOW',
            p: new THREE.Vector3(0, -246+27, 0),
            q: new THREE.Quaternion(0,0,0,1),
            children: [
              {stl: 'RIGHT_WRIST',
              p: new THREE.Vector3(0, -216, 0),
              q: new THREE.Quaternion(0,0,0,1),}
            ]
          }
          ]
        }
        ]
      }
      ]
    }
    ]
  }
  skeleton.children.push(rarm_chain);
  //
  var larm_chain = {
    stl: 'RIGHT_SHOULDER_PITCH',
    p: new THREE.Vector3(184, -8, 0),
    q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,0,1)), 1.5708 ),
    children: [
      {stl: 'RIGHT_SHOULDER_ROLL',
      p: new THREE.Vector3(0, -50, 24),
      q: new THREE.Quaternion(0,0,0,1),
      children: [
        {// yaw
        p: new THREE.Vector3(0, 0, 0),
        q: new THREE.Quaternion(0,0,0,1),
        children: [
          {stl: 'RIGHT_ARM',
          p: new THREE.Vector3(0, -27, -24),
          q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,1,0)), 3.14159 ),
          children: [
            {stl: 'RIGHT_ELBOW',
            p: new THREE.Vector3(0, -246+27, 0),
            q: new THREE.Quaternion(0,0,0,1),
            children: [
              {stl: 'RIGHT_WRIST',
              p: new THREE.Vector3(0, -216, 0),
              q: new THREE.Quaternion(0,0,0,1),}
            ]
          }
          ]
        }
        ]
      }
      ]
    }
    ]
  }
  skeleton.children.push(larm_chain);
  //
  var waist_chain = {
    stl: 'PELVIS',
    q: new THREE.Quaternion(0,0,0,1),
    p: new THREE.Vector3(0, -295.5, 0),
    children:[{ stl: 'TORSO_PITCH_SERVO',
      q: new THREE.Quaternion(0,0,0,1),
      p: new THREE.Vector3(0, 86, 0),
    }]
  };
  skeleton.children.push(waist_chain);
  //
  var rleg_chain = {
    stl: 'LEFT_HIP_YAW',
    q: new THREE.Quaternion(0,0,0,1),
    p: new THREE.Vector3(-72, -312-64, 0),
    children:[{
      stl: 'RIGHT_HIP_ROLL',
      q: new THREE.Quaternion(0,0,0,1),
      p: new THREE.Vector3(0, -64, 0),
      children:[{
        stl: 'R_THIGH',
        q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,1,0)), 3.14159 ),
        p: new THREE.Vector3(0, 0, 0),
        children:[{
          stl: 'R_LEG',
          q: new THREE.Quaternion(0,0,0,1),
          p: new THREE.Vector3(0, -300, 0),
          children:[{
            stl: 'FOOT',
            q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,1,0)), 3.14159 ),
            p: new THREE.Vector3(0, -300, 0),
          }]
        }]
      }]
    }]
  };
  skeleton.children.push(rleg_chain);
  //
  var lleg_chain = {
    stl: 'LEFT_HIP_YAW',
    q: new THREE.Quaternion(0,0,0,1),
    p: new THREE.Vector3(72, -312-64, 0),
    children:[{
      stl: 'RIGHT_HIP_ROLL',
      q: new THREE.Quaternion(0,0,0,1),
      p: new THREE.Vector3(0, -64, 0),
      children:[{
        stl: 'L_THIGH',
        q: new THREE.Quaternion(0,0,0,1),
        p: new THREE.Vector3(0, 0, 0),
        children:[{
          stl: 'L_LEG',
          q: new THREE.Quaternion(0,0,0,1),
          p: new THREE.Vector3(0, -300, 0),
          children:[{
            stl: 'FOOT',
            q: new THREE.Quaternion(0,0,0,1),
            p: new THREE.Vector3(0, -300, 0),
          }]
        }]
      }]
    }]
  };
  skeleton.children.push(lleg_chain);
  
  var material = new THREE.MeshPhongMaterial({
    // Black knight! http://encycolorpedia.com/313637
    ambient: 0xFDEEF4, color: 0x313637, specular: 0x111111, shininess: 200
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
    //chain_tr.setPosition(root.p);
    
    if(root.parent!==undefined){
      //chain_tr.multiply( root.parent.chain_tr );
      chain_tr.multiplyMatrices( root.parent.chain_tr, chain_tr );
    }

    // update the transform of the mesh
    var mesh = root.mesh;
    if(mesh!==undefined){
      mesh.position.getPositionFromMatrix(chain_tr);
      mesh.rotation.setFromRotationMatrix(chain_tr);
    }

    // Save the chain'd tr
    root.chain_tr = chain_tr;

    if(root.children===undefined){return;}
    // transform children
    for(var c=0;c<root.children.length;c++){
      update_skeleton(root.children[c]);
    }
  } // update skeleton
  
  // Move the robot (given robot coord, not THREEjs)
  Robot.set_pose = function(pose){
    // save pose
    Robot.px = pose[0];
    Robot.py = pose[1];
    Robot.pa = pose[2];
    // Update the skeleton model
    skeleton.p.x = 1000*Robot.py;
    skeleton.p.z = 1000*Robot.px;
    update_skeleton();
    World.render();
  }
  
  Robot.setup = function(cb){
    is_loaded_cb = cb;
    n_stl = load_skeleton(skeleton);
    
    // Websocket Configuration for feedback
    var port = 9013;
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    // Should not need this...
    ws.binaryType = "arraybuffer";
    ws.onmessage = function(e){
      //console.log(e);
      var feedback = JSON.parse(e.data);
      //console.log(feedback.pose,feedback.pose_odom,feedback.pose_slam)
      Robot.set_pose(feedback.pose);
      Robot.bodyHeight = feedback.body_height;
      // Use rpy for bodyTilt
      Robot.bodyTilt = feedback.rpy[1];
    }
  }
  
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