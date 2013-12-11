(function(ctx){
  
  // Function to hold methods
  function Door(){}

  // ASSUMPTIONS
  // 84 cm from hinge to handle
  // 6 cm from door surface to handle
  // 5 cm from handle axis to grip point in y direction
  // Handle height is 40 cm
  var door_width = 0.84;
  var handle_offset_x = -0.06;
  var handle_offset_y = 0.05;
  var handle_height = 1.016;

  // Relative waypoint offset in ROBOT coordinates
  // but with THREE scale (mm)
  // Pull and Push use different hand, so THEORETICALLY
  // offset should be different, but can use waypoint to adjust
  // PULL DOOR: (-27 cm) + (-84 cm) ~= -110 cm
  // PUSH DOOR: (27 cm) + (-84 cm) ~= -57 cm
  // var offset = new THREE.Vector2(600,-1100);
  var offset = new THREE.Vector2(480,-500);

  //////////////
  // RPC URLs //
  //////////////
  var rpc_url = rest_root+'/m/hcm/door/model';
  // Assume just zero yaw? I mean, for real...
  var rpc_url_yaw = rest_root+'/m/hcm/door/yaw';

  /////////////////////
  // Mesh definition //
  /////////////////////
  var hinge_mesh,
  door_mesh,
  knob_mesh,
  handle_mesh,
  item_mesh;
  var item_angle = new THREE.Euler();
  // mm positions
  var door_height     = 1500;
  var door_thickness  = 30;
  var hinge_height    = 25;
  var handle_thickness = 8;
  var knob_rad        = 10;
  var make_door = function(hinge_pos,door_radius,handle_pos,handle_endpos){
    if(hinge_mesh!==undefined){
      // Disposal for memory reasons
      World.remove(hinge_mesh);
      hinge_mesh.geometry.dispose();
      door_mesh.geometry.dispose();
      knob_mesh.geometry.dispose();
      handle_mesh.geometry.dispose();
    }
    // From the THREE-ized hcm model, make the set of door meshes
    // First, the hinge
    var hinge_mat  = new THREE.MeshPhongMaterial({color: 0x111111,emissive:0x222222,side: THREE.DoubleSide});
    var hinge_geo  = new THREE.CylinderGeometry(door_thickness/2,door_thickness/2,door_height,8,1,true);
    hinge_mesh = new THREE.Mesh( hinge_geo, hinge_mat );
    //hinge_mesh.geometry = hinge_geo;
    //hinge_mesh.material = hinge_mat;
    hinge_mesh = new THREE.Mesh(hinge_geo,hinge_mat),
    hinge_mesh.position.copy(hinge_pos);
    // Move the door up to be on the ground
    hinge_mesh.position.y = door_height/2;
    // front surface of door is in hcm
    hinge_mesh.position.z += door_thickness/2;
    // Second, the door itself
    var door_geo = new THREE.CubeGeometry(Math.abs(door_radius),door_height,door_thickness);
    var door_mat = new THREE.MeshPhongMaterial({color: 0xFFFFFF,emissive:0x888888});
    door_mesh = new THREE.Mesh( door_geo, door_mat );
    //door_mesh.geometry = door_geo;
    //door_mesh.material = door_mat;
    door_mesh.position.x = door_radius/2;
    // Third, the door knob
    var handle_offset = handle_pos.z - hinge_pos.z;
    var knob_mat  = new THREE.MeshPhongMaterial({color: 0x4488FF,side: THREE.DoubleSide});
    var knob_geo  = new THREE.CylinderGeometry(knob_rad,knob_rad,handle_offset,8,1,true);
    knob_mesh = new THREE.Mesh( knob_geo, knob_mat );
    //knob_mesh.geometry = knob_geo;
    //knob_mesh.material = knob_mat;
    knob_mesh.rotation.set( Math.PI/2,0,0 );
    knob_mesh.position.x = door_radius;
    knob_mesh.position.z = (handle_offset-door_thickness)/2;
    knob_mesh.position.y = (hinge_pos.y - door_height/2);
    // Fourth, the door handle
    var handle_diff = (new THREE.Vector3()).subVectors(handle_endpos,handle_pos);
    var handle_len = handle_diff.length();
    var handle_geo = new THREE.CubeGeometry(handle_len,2*knob_rad,handle_thickness);
    var handle_mat = new THREE.MeshPhongMaterial({color: 0x4488FF});
    handle_mesh = new THREE.Mesh( handle_geo, handle_mat );
    //handle_mesh.geometry = handle_geo;
    //handle_mesh.material = handle_mat;    
    if(door_radius>0){
      handle_mesh.position.x = door_radius - handle_len/2;
    } else {
      handle_mesh.position.x = door_radius + handle_len/2;
    }
    //console.log('door handle',handle_offset,handle_thickness,door_thickness)
    handle_mesh.position.z = (handle_thickness-door_thickness)/2 + handle_offset;
    handle_mesh.position.y = hinge_pos.y - door_height/2;
    //(handle_offset+handle_thickness)/2;
    
    // Scene graph time!
    hinge_mesh.add(handle_mesh);
    hinge_mesh.add(knob_mesh);
    hinge_mesh.add(door_mesh);
    
    // add to the world
    World.add(hinge_mesh);
    
    // update the item
    item_mesh = hinge_mesh;
  }
  
  //////////////////////
  // Model converters //
  //////////////////////
  var model_to_three = function(model){
    // undefined door goes to the default
    if(model===undefined){
      model = [
      0.45,0.85,handle_height-Robot.bodyHeight, //Hinge XYZ pos from robot frame
    	door_width, //Door radius, negative - left hinge, positive - right hinge
    	handle_offset_x, //The X offset of the door handle (from door surface)
    	handle_offset_y, //The Y offset of the knob axis (from gripping pos)
      ];
    }
      
    // overrides due to assumptions!
    if(model[3]<0) {model[3] = -door_width;} else {model[3] = door_width;}
    model[4] = handle_offset_x;
    model[5] = handle_offset_y;
    
    // Make into THREE coords
    hinge_pos = Transform.torso_to_three(model[0],model[1],model[2],Robot);
    // negative: left hinge | positive: right hinge
    door_radius = 1000*model[3];
    handle_pos = Transform.torso_to_three(model[0]+model[4],model[1],model[2],Robot);
    handle_endpos = Transform.torso_to_three(model[0]+model[4],model[1]+model[5],model[2],Robot);    
    
    //console.log(hinge_pos,handle_pos,handle_endpos)
    // Make the model
    make_door(
      (new THREE.Vector3()).fromArray(hinge_pos),
      door_radius,
      (new THREE.Vector3()).fromArray(handle_pos),
      (new THREE.Vector3()).fromArray(handle_endpos)
    );
    
    // apply some yaw based upon our pose
    var q_pose = (new THREE.Quaternion()).setFromAxisAngle(
      (new THREE.Vector3(0,1,0)), Robot.pa );
    var q_door = (new THREE.Quaternion()).setFromEuler(hinge_mesh.rotation);
    var q_yaw = (new THREE.Quaternion()).multiplyQuaternions(q_pose,q_door);
    hinge_mesh.rotation.setFromQuaternion(q_yaw);
    
  }
  var three_to_model = function(){
    var model = [0,1000,500,door_width,handle_offset_x,handle_offset_y];
    // Grab the position of the hinge
    var p = (new THREE.Vector3()).copy(hinge_mesh.position);
    // Put to the ground
    p.y = 0;
    var robot_hinge = Transform.three_to_torso(p,Robot);
    model[0] = robot_hinge[0];
    model[1] = robot_hinge[1];
    
    // Need to use the current robot bodyHeight
    model[2] = handle_height - Robot.bodyHeight;
    
    // kill off the yaw from the pose
    var q_pose_inv = (new THREE.Quaternion()).setFromAxisAngle(
      (new THREE.Vector3(0,1,0)), Robot.pa ).inverse();
    var q_door = (new THREE.Quaternion()).setFromEuler(hinge_mesh.rotation);
    var q_yaw = (new THREE.Quaternion()).multiplyQuaternions(q_pose_inv,q_door);
    var e_door = (new THREE.Euler()).setFromQuaternion(q_yaw);
    var yaw = e_door.y;
    
    // Check the yaw to set the door radius...
    //if(model[3]<0){model[3] = -door_width;}else{model[3] = door_width;}
    
    return model;
  }

    // Adjust the waypoint to the *perfect* position
  var wp_callback = function(){
    // Grab the (global) orientation of the mesh
    var pa = item_mesh.rotation.y;
    // Acquire the position of the tip:
    var p = (new THREE.Vector3()).copy(item_mesh.position);
    // Make the global offset from the object    
    var dx = offset.x*Math.cos(pa) - offset.y*Math.sin(pa);
    var dy = offset.y*Math.cos(pa) + offset.x*Math.sin(pa);
    // Change the THREE coordinates of the desired waypoint
    p.x -= dy;
    p.z -= dx;
    // Update the Waypoint in the scene
    Waypoint.set(p,pa);
  }

  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  Door.select = function(p,r){
    item_mesh.position.copy(p);
    wp_callback();
    Door.send();
  }

  Door.clear = function(tcontrol){
    // Get the model from the robot (could be pesky...?)
    qwest.get( rpc_url,{},{},function(){
      // Use a 1 second timeout for the XHR2 request for getting the model
      this.timeout = 1000; // ms
    })
    .success(function(model){
      model_to_three(model);
      item_mesh = hinge_mesh;
      
    })
    .error(function(msg){
      console.log('Error loading door!',msg);
      model_to_three();
      item_mesh = hinge_mesh;
      
    });
  }
  // enter
  Door.init = function(){
    // Initial silly model
    model_to_three();
  }
  // exit
  Door.deinit = function(){
    World.remove(hinge_mesh);
  }
  // send to the robot
  Door.send = function(){
    var model = three_to_model();
    qwest.post( rpc_url, {val:JSON.stringify(model)} );
  }
  // loop the tcontrol
  Door.loop = function(tcontrol){
    if(Manipulation.is_mod==false){
      // Just reload the model from the robot
      Door.clear();
      return;
    }
    // cycle the tcontrol
    if(item_mesh===hinge_mesh){
      tcontrol.detach( item_mesh );
      item_mesh = handle_mesh;
    } else {
      tcontrol.detach( item_mesh );
      item_mesh = hinge_mesh;
    }
    tcontrol.attach( item_mesh );
    tcontrol.update();
    
  }
  // get the mesh
  Door.get_mod_mesh = function(){
    return item_mesh;
  }
  Door.mod_callback = function(){
    // no rotation
    hinge_mesh.rotation.x = 0;
    hinge_mesh.rotation.z = 0;
    // Not even yaw allowed... assume we get to perfect yaw=0
    //hinge_mesh.rotation.y = 0;
    // need robot pose...
    
    // no up and down movement
    hinge_mesh.position.y = door_height/2;

    // Update the global waypoint
    wp_callback();

  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  Door.item_name = 'Door';
  // export
	ctx.Door = Door;

})(this);