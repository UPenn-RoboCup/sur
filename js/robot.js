/*****
 * Mesh object for buttons and data associated with robot meshes
 */
(function(ctx){
  
  // Object to hold our various setup/interaction methods from main.js
  function Robot(){}
  
  /* robot bodyHeight, but this can change a LOT */
  Robot.bodyTilt = 11*Math.PI/180;
  Robot.bodyHeight = 0.9285318;
  // pose
  Robot.px = 0;
  Robot.py = 0;
  Robot.pa = 0;
  // camera
  Robot.head_camera = null;
  
  var n_loaded = 0, nstl = 0;
  var is_loaded_cb, is_loaded = false;
  Robot.meshes = [];
  
  var jangles = [
    0, 0, //head
    0,0,0,0,0,0,0, //larm
    0,0,0,0,0,0, //lleg
    0,0,0,0,0,0, //rleg
    0,0,0,0,0,0,0, //rarm
    0,0, //waist
  ];
  
  var shown = true;
  
  // Skeleton
  var skeleton = {
    q: new THREE.Quaternion(0,0,0,1),
    p: new THREE.Vector3(0, 0, 0),
    children: [
    {
      stl: 'CHEST',
      q: new THREE.Quaternion(0,0,0,1),
      p: new THREE.Vector3(0, 170, 0),
      axel: new THREE.Vector3(1,0,0),
      id: 30,
      children: [
      ]
    },
    {
      stl: 'PELVIS',
      q: new THREE.Quaternion(0,0,0,1),
      p: new THREE.Vector3(0, -128, 0),
      axel: new THREE.Vector3(0,1,0),
      id: 29,
      children: [
      ]
    },
    {
      stl: 'TORSO_PITCH_SERVO',
      q: new THREE.Quaternion(0,0,0,1),
      p: new THREE.Vector3(0, -40, 0),
    }
    ]
  };
  
  // upper and lower body
  var upper_body_chest = skeleton.children[0];
  var lower_body_pelvis = skeleton.children[1];
  
  var neck_chain = {
    stl: 'NECK',
    q: new THREE.Quaternion(0,0,0,1),
    p: new THREE.Vector3(0, 40, 0),
    axel: new THREE.Vector3(0,-1,0),
    id: 1,
    children: [{
      stl: 'CAM',
      p: new THREE.Vector3(0, 111, 0),
      q: new THREE.Quaternion(0,0,0,1),
      axel: new THREE.Vector3(1,0,0),
      id: 2,
      children: [{
      // camera (measured to be OK)
      p: new THREE.Vector3(0, 70, 85),
      q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,1,0)), 3.14159 ),
      camera: new THREE.PerspectiveCamera( 43.3, 16/9, 10, 30000 ),
    },]
    },
    ]
  }
  upper_body_chest.children.push(neck_chain);
  
  //
  var larm_chain = {
    stl: 'RIGHT_SHOULDER_PITCH',
    p: new THREE.Vector3(184, -8, 0),
    q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,0,1)), 1.5708 ),
    axel: new THREE.Vector3(1,0,0),
    id: 3,
    children: [
      {stl: 'RIGHT_SHOULDER_ROLL',
      p: new THREE.Vector3(0, -50, 24),
      q: new THREE.Quaternion(0,0,0,1),
      axel: new THREE.Vector3(0,0,-1),
      id: 4,
      children: [
        {// yaw
        p: new THREE.Vector3(0, 0, 0),
        q: new THREE.Quaternion(0,0,0,1),
        axel: new THREE.Vector3(0,-1,0),
        id: 5,
        children: [
          {stl: 'RIGHT_ARM',
          p: new THREE.Vector3(0, -27, -24),
          q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,1,0)), 3.14159 ),
          children: [
            {stl: 'RIGHT_ELBOW',
            p: new THREE.Vector3(0, -246+27, 0),
            q: new THREE.Quaternion(0,0,0,1),
            axel: new THREE.Vector3(-1,0,0),
            id: 6,
            children: [
              {stl: 'RIGHT_WRIST',
              p: new THREE.Vector3(0, -216, 0),
              q: new THREE.Quaternion(0,0,0,1),
              axel: new THREE.Vector3(0,-1,0),
              id: 7,
              children:[{
                q: new THREE.Quaternion(0,0,0,1),
                p: new THREE.Vector3(0, 0, 0),
                axel: new THREE.Vector3(0,0,-1),
                id: 8,
                children:[{
                  stl: 'RIGHT_WRIST',
                  q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(1,0,0)), 3.14159/2 ),
                  p: new THREE.Vector3(0, -65, 0),
                  axel: new THREE.Vector3(0,-1,0),
                  id: 9,
                  children:[{
                    stl: 'LEFT_GRIPPER',
                    q: (new THREE.Quaternion()).setFromEuler( new THREE.Euler(Math.PI/2,0,-Math.PI) ),
                    p: new THREE.Vector3(0, 0, 18),
                  }]
                }]
              }]
            }]
          }]
        }]
      }]
    }]
  }
  upper_body_chest.children.push(larm_chain);
  var right_hand = null;
  var lgripper = larm_chain;
  while(lgripper.children!==undefined){lgripper = lgripper.children[0];}
  //
  var lleg_chain = {
    stl: 'LEFT_HIP_YAW',
    q: new THREE.Quaternion(0,0,0,1),
    p: new THREE.Vector3(72, -16-64, 0),
    axel: new THREE.Vector3(0,1,0),
    id: 10,
    children:[{
      stl: 'RIGHT_HIP_ROLL',
      q: new THREE.Quaternion(0,0,0,1),
      p: new THREE.Vector3(0, -64, 0),
      axel: new THREE.Vector3(0,0,1),
      id: 11,
      children:[{
        stl: 'L_THIGH',
        q: new THREE.Quaternion(0,0,0,1),
        p: new THREE.Vector3(0, 0, 0),
        axel: new THREE.Vector3(1,0,0),
        id: 12,
        children:[{
          q: new THREE.Quaternion(0,0,0,1),
          p: new THREE.Vector3(0, -300, -25),
          axel: new THREE.Vector3(1,0,0),
          id: 13,
          children:[{
            stl: 'L_LEG',
            q: new THREE.Quaternion(0,0,0,1),
            p: new THREE.Vector3(0, 0, 25),
            children:[{
              stl: 'LEFT_ANKLE',
              q: new THREE.Quaternion(0,0,0,1),
              p: new THREE.Vector3(0, -300, 0),
              axel: new THREE.Vector3(1,0,0),
              id: 14,
              children:[{
                stl: 'FOOT',
                q: new THREE.Quaternion(0,0,0,1),
                p: new THREE.Vector3(0, 0, 0),
                axel: new THREE.Vector3(0,0,1),
                id: 15,
              }]
            }]
          }]
        }]
      }]
    }]
  };
  lower_body_pelvis.children.push(lleg_chain);
  //
  var rleg_chain = {
    stl: 'LEFT_HIP_YAW',
    q: new THREE.Quaternion(0,0,0,1),
    p: new THREE.Vector3(-72, -16-64, 0),
    axel: new THREE.Vector3(0,1,0),
    id: 16,
    children:[{
      stl: 'RIGHT_HIP_ROLL',
      q: new THREE.Quaternion(0,0,0,1),
      p: new THREE.Vector3(0, -64, 0),
      axel: new THREE.Vector3(0,0,1),
      id: 17,
      children:[{
        stl: 'R_THIGH',
        q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,1,0)), 3.14159 ),
        p: new THREE.Vector3(0, 0, 0),
        axel: new THREE.Vector3(1,0,0),
        id: 18,
        children:[{
          axel: new THREE.Vector3(-1,0,0),
          id: 19,
          q: new THREE.Quaternion(0,0,0,1),
          p: new THREE.Vector3(0, -300, 25),
          children:[{
            stl: 'R_LEG',
            q: new THREE.Quaternion(0,0,0,1),
            p: new THREE.Vector3(0, 0, -25),
            children:[{
              stl: 'LEFT_ANKLE',
              q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,1,0)), 3.14159 ),
              p: new THREE.Vector3(0, -300, 0),
              axel: new THREE.Vector3(-1,0,0),
              id: 20,
              children:[{
                stl: 'FOOT',
                q: new THREE.Quaternion(0,0,0,1),
                p: new THREE.Vector3(0, 0, 0),
                axel: new THREE.Vector3(0,0,1),
                id: 21,
              }]
            }]
          }]
        }]
      }]
    }]
  };
  lower_body_pelvis.children.push(rleg_chain);
  //
  var rarm_chain = {
    stl: 'RIGHT_SHOULDER_PITCH',
    p: new THREE.Vector3(-184, -8, 0),
    q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,0,1)), -1.5708 ),
    axel: new THREE.Vector3(1,0,0),
    id: 22,
    children: [
      {stl: 'RIGHT_SHOULDER_ROLL',
      p: new THREE.Vector3(0, -50, 24),
      q: new THREE.Quaternion(0,0,0,1),
      axel: new THREE.Vector3(0,0,-1),
      id: 23,
      children: [
        {// yaw
        p: new THREE.Vector3(0, 0, 0),
        q: new THREE.Quaternion(0,0,0,1),
        axel: new THREE.Vector3(0,-1,0),
        id: 24,
        children: [
          {stl: 'RIGHT_ARM',
          p: new THREE.Vector3(0, -27, -24),
          q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0,1,0)), 3.14159 ),
          children: [
            {stl: 'RIGHT_ELBOW',
            p: new THREE.Vector3(0, -246+27, 0),
            q: new THREE.Quaternion(0,0,0,1),
            axel: new THREE.Vector3(-1,0,0),
            id: 25,
            children: [
              {stl: 'RIGHT_WRIST',
              p: new THREE.Vector3(0, -216, 0),
              q: new THREE.Quaternion(0,0,0,1),
              axel: new THREE.Vector3(0,-1,0),
              id: 26,
              children:[{
                q: new THREE.Quaternion(0,0,0,1),
                p: new THREE.Vector3(0, 0, 0),
                axel: new THREE.Vector3(0,0,-1),
                id: 27,
                children:[{
                  stl: 'RIGHT_WRIST',
                  q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(1,0,0)), 3.14159/2 ),
                  p: new THREE.Vector3(0, -65, 0),
                  axel: new THREE.Vector3(0,-1,0),
                  id: 28,
                  children:[{
                    stl: 'RIGHT_GRIPPER',
                    q: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(1,0,0)), -3.14159/2 ),
                    p: new THREE.Vector3(0, 0, 18),
                  }]
                }]
              }]
            }]
          }]
        }]
      }]
    }]
  }
  upper_body_chest.children.push(rarm_chain);
  var rgripper = rarm_chain;
  while(rgripper.children!==undefined){rgripper = rgripper.children[0];}
  
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
    
    // Move the motors based on the joint feedback
    if (root.id!==undefined){
      var servo_rot = (new THREE.Quaternion())
      .setFromAxisAngle(root.axel, jangles[root.id-1] );
      // Offset
      var offset_pos = new THREE.Vector3();
      offset_pos.copy(root.p);
      offset_pos.applyQuaternion( servo_rot );
      // Full rotation
      var offset_rot = (new THREE.Quaternion()).multiplyQuaternions(servo_rot,root.q);
      chain_tr.makeRotationFromQuaternion(offset_rot).setPosition(root.p);
    } else {
      chain_tr.makeRotationFromQuaternion(root.q).setPosition(root.p);
    }
    
    if(root.parent!==undefined){
      chain_tr.multiplyMatrices( root.parent.chain_tr, chain_tr );
    }

    // update the transform of the mesh
    var mesh = root.mesh;
    if(mesh!==undefined){
      mesh.position.getPositionFromMatrix(chain_tr);
      mesh.rotation.setFromRotationMatrix(chain_tr);
    }

    // head camera
    if(root.camera!==undefined){
      root.camera.position.getPositionFromMatrix(chain_tr);
      root.camera.rotation.setFromRotationMatrix(chain_tr);
      root.camera.updateProjectionMatrix();
    }

    // Save the chain'd tr
    root.chain_tr = chain_tr;

    // transform children
    if(root.children===undefined){return;}
    for(var c=0;c<root.children.length;c++){update_skeleton(root.children[c]);}
    
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
  };
  
  Robot.make_virtual_hands = function(){
    //console.log('Virtual hands!',lgripper,rgripper);
    var lg2 = new THREE.Mesh(
      lgripper.mesh.geometry.clone(),
      new THREE.MeshPhongMaterial({
        ambient: 0xFDEEF4, color: 0xFF0000, specular: 0x111111, shininess: 200
      })
    );
    var rg2 = new THREE.Mesh(
      rgripper.mesh.geometry.clone(),
      new THREE.MeshPhongMaterial({
        ambient: 0xFDEEF4, color: 0xFF0000, specular: 0x111111, shininess: 200
      })
    );
    // Rotate correctly
    rg2.rotation.set(-Math.PI/2,Math.PI,0);
    // Copy the hand and its position
    return {left: lg2, right: rg2};
  }
  
  Robot.setup = function(cb){
    is_loaded_cb = cb;
    n_stl = load_skeleton(skeleton);
    Robot.head_camera = neck_chain.children[0].children[0].camera;
    Robot.head_camera.setLens( 3.67, 2.914 );
    // add to the world
    World.add(Robot.head_camera);
    //Robot.head_camera.lookAt(0,0,1000);
    var help = new THREE.CameraHelper(Robot.head_camera );
    World.add(help);
    
    // Websocket Configuration for feedback
    var port = 9013;
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    // Should not need this...
    ws.binaryType = "arraybuffer";
    ws.onmessage = function(e){
      //console.log(e);
      var feedback = JSON.parse(e.data);
      //console.log(feedback);
      // set the robot stuff
      Robot.set_pose(feedback.pose);
      // Use rpy for bodyTilt
      Robot.bodyTilt = feedback.rpy[1];
      // Update the skeleton root
      Robot.bodyHeight = feedback.body_height;
      //console.log('bH',Robot.bodyHeight)
      // Update the skeleton
      //console.log('rp',skeleton.p)
      skeleton.p.setY(1000*Robot.bodyHeight-15);
      //skeleton.p.z-=100;
      skeleton.q.setFromAxisAngle((new THREE.Vector3(1,0,0)), Robot.bodyTilt )
      
      // Joint angle offsets
      //feedback.neckangle[0] = 0;
      //
      feedback.larmangle[0] += Math.PI/2;
      feedback.rarmangle[0] += Math.PI/2;
      //
      feedback.larmangle[1] -= Math.PI/2;
      feedback.rarmangle[1] += Math.PI/2;
      //
      feedback.larmangle[2] += Math.PI;
      feedback.rarmangle[2] += Math.PI
      //
      //feedback.larmangle[3] += Math.PI;
            
      // Update jangles
      jangles = feedback.neckangle.concat(feedback.larmangle,feedback.llegangle,feedback.rlegangle,feedback.rarmangle,feedback.waistangle)
      update_skeleton();
      World.render();
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