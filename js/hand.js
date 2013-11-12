/*****
 * 3D tool model
 */
(function(ctx){
  
  // Function to hold methods
  function Hand(){}
  // For manipulation
  Hand.item_name = 'Hand';
  // Sending to the robot
  var rpc_url_lget = rest_root+'/m/hcm/hands/left_tr_target'
  var rpc_url_lset = rest_root+'/m/hcm/hands/left_tr_target'
  //
  var rpc_url_rget = rest_root+'/m/hcm/hands/right_tr_target'
  var rpc_url_rset = rest_root+'/m/hcm/hands/right_tr_target'

  // Instantiate the master
  var item_mesh = null;
  var item_mesh_default_rot = new THREE.Quaternion();
  var item_mesh_default_rot_inv = new THREE.Quaternion();

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
    var q = (new THREE.Quaternion()).setFromEuler(item_mesh.rotation)
    var q_robot = (new THREE.Quaternion()).multiplyQuaternions(q,item_mesh_default_rot_inv);
    var rpy = (new THREE.Euler()).setFromQuaternion(q_robot);
    var tr = Transform.three_to_torso(item_mesh.position,Robot)
    tr.push(rpy.z, rpy.x, rpy.y)
    qwest.post( rpc_url_rset, {val:JSON.stringify(tr)} );
  }
  
  ///////////////////////
  // object manipulation API
  // set up the intersection handler
  // point in THREEjs: p
  // point in robot: r
  Hand.select = function(p,r){
    // Set the position
    item_mesh.position.copy(p);
    // Add to the world
    World.add(item_mesh);
    // Re-render
    World.render();
    // 
    //send_model_to_robot();
  }
  Hand.clear = function(){
    // Stop modifying
    Wheel.stop_modify();
    // Remove the tool
    World.remove(item_mesh);
    // Re render the scene
    World.render();
  }
  Hand.start_modify = function(){
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
  Hand.stop_modify = function(){
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
    send_model_to_robot();
  }
  Hand.init = function(){
    // Grab the current transform
    qwest.get( rpc_url_rget ).success(function(tr){
      // Convert the position to THREEjs
      var pos_array = Transform.torso_to_three(tr[0],tr[1],tr[2],Robot);
      var rot_q = (new THREE.Quaternion()).setFromEuler(new THREE.Euler(tr[4],tr[5],tr[3]));
      var full_rot = new THREE.Quaternion();
      full_rot.multiplyQuaternions(rot_q,item_mesh_default_rot)
      //
      item_mesh.rotation.setFromQuaternion(full_rot);
      item_mesh.position.fromArray(pos_array);
      // Add to the world
      World.add(item_mesh);
      // Re-render
      World.render();
    });
  }
  ///////////////////////
  
  Hand.setup = function(){
    var item_meshes = Robot.make_virtual_hands();
    // Right as defult for now
    item_mesh = item_meshes.right;
    item_mesh_default_rot.setFromEuler(item_mesh.rotation);
    item_mesh_default_rot_inv.copy(item_mesh_default_rot).inverse();
  }

  // export
	ctx.Hand = Hand;

})(this);