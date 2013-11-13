/*****
 * 3D door model
 */
(function(ctx){
  
  // Function to hold methods
  function Door(){}
  // For manipulation
  Door.item_name = 'Door';
  Door.grab_evt = 'doorgrab';
  // Sending to the robot
  var rpc_url = rest_root+'/m/hcm/door/model'
  
  var item_angle = new THREE.Euler();
  var item_mesh, hinge_mesh, door_mesh, knob_mesh, handle_mesh;
  
  var make_door2 = function(hinge_pos,door_radius,handle_pos,handle_endpos){
    // From the THREE-ized hcm model, make the set of door meshes
    var door_height     = 1500; // mm
    var door_thickness  = 30;   // mm
    var hinge_height    = 25; // mm
    var hinge_thickness = 8; //mm
    // First, the hinge
    var hinge_mat  = new THREE.MeshPhongMaterial({color: 0xFFFFFF,emissive:0x888888,side: THREE.DoubleSide});
    var hinge_geo  = new THREE.CylinderGeometry(door_thickness/2,door_thickness/2,door_height,8,1,true);
    hinge_mesh = new THREE.Mesh( hinge_geo, hinge_mat );
    hinge_mesh.position.copy(hinge_pos);
    // Move the door up to be on the ground
    hinge_mesh.position.y = door_height/2;
    // front surface of door is in hcm
    hinge_mesh.position.z += door_thickness/2;
    // Second, the door itself
    var door_geo = new THREE.CubeGeometry(Math.abs(door_radius),door_height,door_thickness);
    var door_mat = new THREE.MeshPhongMaterial({color: 0xFFFFFF,emissive:0x888888});
    door_mesh = new THREE.Mesh( door_geo, door_mat );
    door_mesh.position.x += door_radius/2;
    // Third, the door knob
    var handle_offset = handle_pos.z - hinge_pos.z;
    var knob_rad = 10;
    var knob_mat  = new THREE.MeshPhongMaterial({color: 0x4488FF,side: THREE.DoubleSide});
    var knob_geo  = new THREE.CylinderGeometry(knob_rad,knob_rad,handle_offset,8,1,true);
    knob_mesh = new THREE.Mesh( knob_geo, knob_mat );
    knob_mesh.rotation.set( Math.PI/2,0,0 );
    knob_mesh.position.x = door_radius;
    knob_mesh.position.z -= (door_thickness-handle_offset)/2;
    // Fourth, the door handle
    var handle_diff = (new THREE.Vector3()).subVectors(handle_endpos,handle_pos);
    var handle_len = handle_diff.length();
    var handle_geo = new THREE.CubeGeometry(handle_len,hinge_thickness,2*knob_rad);
    var handle_mat = new THREE.MeshPhongMaterial({color: 0x4488FF});
    handle_mesh = new THREE.Mesh( handle_geo, handle_mat );
    handle_mesh.position.x = handle_len/2;
    handle_mesh.position.y = (handle_offset+hinge_thickness)/2;
    // Scene graph time!
    knob_mesh.add(handle_mesh);
    hinge_mesh.add(knob_mesh);
    hinge_mesh.add(door_mesh);
    // update the item
    item_mesh = hinge_mesh;
  }
  
  var model_to_three = function(model){    
    var hinge_pos = [0,1000,500], 
    door_radius = 500, 
    handle_pos = [-50,1000,500], 
    handle_endpos = [-50,900,500];
    if(model!==undefined){    
      hinge_pos = Transform.torso_to_three(model[0],model[1],model[2],Robot);
      // negative: left hinge | positive: right hinge
      door_radius = 1000*model[3];
      handle_pos = Transform.torso_to_three(model[0]+model[4],model[1],model[2],Robot);
      handle_endpos = Transform.torso_to_three(model[0]+model[4],model[1]+model[5],model[2],Robot);    
    }
    // Make the model
    make_door2(
      (new THREE.Vector3()).fromArray(hinge_pos),
      door_radius,
      (new THREE.Vector3()).fromArray(handle_pos),
      (new THREE.Vector3()).fromArray(handle_endpos)
    );
  }
  
  //model_to_three();

  // TransformControl
  var tcontrol = null;
  var update_tcontrol = function ( event ) {
    switch ( event.keyCode ) {
      case 81: // Q
        tcontrol.setSpace( tcontrol.space == "local" ? "world" : "local" );
        break;
      case 87: // W
        tcontrol.setMode( "translate" );
        break;
      case 69: // E
        tcontrol.setMode( "rotate" );
        break;
      case 82: // R
        tcontrol.setMode( "scale" );
        break;
      // size stuff
      case 187:
      case 107: // +,=,num+
        tcontrol.setSize( tcontrol.size + 0.1 );
        break;
      case 189:
      case 10: // -,_,num-
        tcontrol.setSize( Math.max(tcontrol.size - 0.1, 0.1 ) );
        break;
    }
  };
  
  var send_model_to_robot = function(){
    // Acquire the model
    item_angle.setFromQuaternion(item_mesh.quaternion);
    // Points in THREEjs to torso frame
    var model = Transform.three_to_torso(item_mesh.position,Robot);
    model.push(item_angle.y);
    qwest.post( rpc_url, {val:JSON.stringify(model)} );
  }
  
  ///////////////////////
  // object manipulation API
  // set up the intersection handler
  // point in THREEjs: p
  // point in robot: r
  Door.select = function(p,r){}
  Door.clear = function(){}
  Door.start_modify = function(){
    // stop the normal controls
    World.disable_orbit();
    // grab a tcontrol
    tcontrol = World.generate_tcontrol();
    // Setup the transformcontrols
    tcontrol.addEventListener( 'change', World.render );
    //tcontrol.addEventListener( 'modify', update_angle );
    tcontrol.attach( item_mesh );
    World.add( tcontrol );
    // listen for a keydown
    ctx.addEventListener( 'keydown', update_tcontrol, false );
    // Re-render
    World.render();
  }; // start_modify
  Door.stop_modify = function(){
    if(tcontrol===null){return;}
    World.remove( tcontrol );
    tcontrol.detach( item_mesh );
    tcontrol.removeEventListener( 'change', World.render );
    //tcontrol.removeEventListener( 'modify', update_angle );
    tcontrol = null;
    ctx.removeEventListener( 'keydown', update_tcontrol, false );
    World.enable_orbit();
    // re-render
    World.render();
    // Send to the robot
    //send_model_to_robot();
  }
  
  Door.init = function(){
    // Get the model from the robot (could be pesky...?)
    qwest.get( rpc_url,{},{},function(){
      // Use a 1 second timeout for the XHR2 request for getting the model
      this.timeout = 1000; // ms
    })
    .success(function(model){
      model_to_three(model);
      World.add(item_mesh);
      World.render();
    })
    .error(function(msg){
      // default door model
      model_to_three();
      World.add(item_mesh);
      World.render();
    })
    // Add the item back to the scene
  }
  
  Door.deinit = function(){
    World.remove(item_mesh);
  }
  
  Door.loop = function(){
    // Just reload the model from the robot
    if(Manipulation.is_mod==false){Door.init();return;}
    // cycle the tcontrol
    if(item_mesh===hinge_mesh){
      tcontrol.detach( item_mesh );
      item_mesh = handle_mesh;
    } else {
      tcontrol.detach( item_mesh );
      item_mesh = hinge_mesh;
    }
    tcontrol.attach( item_mesh );
  }
  ///////////////////////
  
  Door.setup = function(){
  }

  // export
	ctx.Door = Door;

})(this);