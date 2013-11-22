(function(ctx){
  
  // Function to hold methods
  function Door(){}

  //////////////
  // RPC URLs //
  //////////////
  var rpc_url = rest_root+'/m/hcm/door/model'

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
    var hinge_pos = [0,1000,500], 
    door_radius = 500, 
    handle_pos = [-50,1000,450], 
    handle_endpos = [-50,900,450];
    if(model!==undefined){
      hinge_pos = Transform.torso_to_three(model[0],model[1],model[2],Robot);
      // negative: left hinge | positive: right hinge
      door_radius = 1000*model[3];
      handle_pos = Transform.torso_to_three(model[0]+model[4],model[1],model[2],Robot);
      handle_endpos = Transform.torso_to_three(model[0]+model[4],model[1]+model[5],model[2],Robot);    
    }
    //console.log(hinge_pos,handle_pos,handle_endpos)
    // Make the model
    make_door(
      (new THREE.Vector3()).fromArray(hinge_pos),
      door_radius,
      (new THREE.Vector3()).fromArray(handle_pos),
      (new THREE.Vector3()).fromArray(handle_endpos)
    );
  }
  var three_to_model = function(){
    var model = [0,1000,500,500,-50,900];
    // Grab the position of the hinge
    var p = (new THREE.Vector3()).copy(hinge_mesh.position);
    p.z -= door_thickness/2;
    var robot_hinge = Transform.three_to_torso(p,Robot);
    model[0] = robot_hinge[0];
    model[1] = robot_hinge[1];
    model[2] = robot_hinge[2]; // not really correct...
    // Grab the radius
    model[3] = knob_mesh.position.x / 1000;
    // Grab the x offset
    model[4] = (handle_mesh.position.z - (handle_thickness-door_thickness)/2)/1000
    // Grab the y knob offset
    model[5] = 2*(handle_mesh.position.x - 2*door_mesh.position.x)/1000;
    return model;
  }

  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  Door.select = function(p,r){
    
  }
  Door.clear = function(tcontrol){
    // Get the model from the robot (could be pesky...?)
    qwest.get( rpc_url,{},{},function(){
      // Use a 1 second timeout for the XHR2 request for getting the model
      this.timeout = 1000; // ms
    })
    .success(function(model){
      tcontrol.detach( item_mesh );
      model_to_three(model);
      item_mesh = hinge_mesh;
      tcontrol.attach( item_mesh );
      World.render();
    })
    .error(function(msg){
      console.log('Error loading door!',msg);
      tcontrol.detach( item_mesh );
      model_to_three();
      item_mesh = hinge_mesh;
      tcontrol.attach( item_mesh );
      World.render();
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
    var m = three_to_model();
    // Acquire the model
    item_angle.setFromQuaternion(item_mesh.quaternion);
    // Points in THREEjs to torso frame
    var model = Transform.three_to_torso(item_mesh.position,Robot);
    model.push(item_angle.y);
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
    World.render();
  }
  // get the mesh
  Door.get_mesh = function(){
    return item_mesh;
  }
  Door.mod_callback = function(){
    
  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  Door.item_name = 'Door';
  Door.grab_evt  = 'doorgrab';
  // export
	ctx.Door = Door;

})(this);