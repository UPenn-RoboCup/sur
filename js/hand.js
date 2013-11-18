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

  // Mesh is a drawing, from the tip as the zero
  var item_mat  = new THREE.MeshLambertMaterial({color: 0xFF0000});
  var item_path = new THREE.Path();
  item_path.fromPoints([
    new THREE.Vector2(0,0), // tip of the hand
    new THREE.Vector2(20,0),
    new THREE.Vector2(20,-100),
    new THREE.Vector2(10,-100),
    new THREE.Vector2(10,-10),
    new THREE.Vector2(0,-10),
  ]);
  var item_shape = item_path.toShapes();
  var item_geo  = new THREE.ExtrudeGeometry(
    item_shape, {amount:20}
  );
  var item_mesh  = new THREE.Mesh( item_geo, item_mat );
  item_mesh.rotation.set( Math.PI/2, 0, 0 );
  //
  var item_mesh_default_rot = new THREE.Quaternion();
  var item_mesh_default_rot_inv = new THREE.Quaternion();
  item_mesh_default_rot.setFromEuler(item_mesh.rotation);
  item_mesh_default_rot_inv.copy(item_mesh_default_rot).inverse();

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
    /*
    // Acquire the model
    var q = (new THREE.Quaternion()).setFromEuler(item_mesh.rotation)
    var q_robot = (new THREE.Quaternion()).multiplyQuaternions(q,item_mesh_default_rot_inv);
    var rpy = (new THREE.Euler()).setFromQuaternion(q_robot);
    var tr = Transform.three_to_torso(item_mesh.position,Robot)
    tr.push(rpy.z, rpy.x, rpy.y)
    qwest.post( rpc_url_rset, {val:JSON.stringify(tr)} );
    */
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
    
    keypress.register_many(my_combos);
  }
  Hand.deinit = function(){
    keypress.unregister_many(my_combos);
  }
  // Loop just resets the hand position to the initial
  Hand.loop = Hand.init;
  ///////////////////////
  
  //////
  // Keypressing hotkeys
  var my_combos = [
  {
    "keys"          : "i",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        item_mesh.position.z += 10;
        World.render();
    },
    "this"          : ctx
  },
  {
    "keys"          : ",",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        item_mesh.position.z -= 10;
        World.render();
    },
    "this"          : ctx
  },
  {
    "keys"          : "j",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        item_mesh.position.x += 10;
        World.render();
    },
    "this"          : ctx
  },
  {
    "keys"          : "l",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        item_mesh.position.x -= 10;
        World.render();
    },
    "this"          : ctx
  }
  ];
  //////

  // export
	ctx.Hand = Hand;

})(this);