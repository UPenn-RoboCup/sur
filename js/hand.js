(function(ctx){
  
  // Function to hold methods
  function Hand(){}

  //////////////
  // RPC URLs //
  //////////////
  var rpc_url_lget = rest_root+'/m/hcm/hands/left_tr_target'
  var rpc_url_lset = rest_root+'/m/hcm/hands/left_tr_target'
  //
  var rpc_url_rget = rest_root+'/m/hcm/hands/right_tr_target'
  var rpc_url_rset = rest_root+'/m/hcm/hands/right_tr_target'
  
  /////////////////////
  // Mesh definition //
  /////////////////////
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
  

  //////////////////////
  // Model converters //
  //////////////////////
  var model_to_three = function(tr){
    var pos_array = Transform.torso_to_three(tr[0],tr[1],tr[2],Robot);
    var rot_q = (new THREE.Quaternion()).setFromEuler(new THREE.Euler(tr[4],tr[5],tr[3]));
    var full_rot = new THREE.Quaternion();
    var full_pos = new THREE.Vector3();
    full_rot.multiplyQuaternions(rot_q,item_mesh_default_rot)
    full_pos.fromArray(pos_array);
    // Update the mesh
    item_mesh.rotation.setFromQuaternion(full_rot);
    item_mesh.position.copy(full_pos);
  }
  var three_to_model = function(){
    var q = (new THREE.Quaternion()).setFromEuler(item_mesh.rotation)
    var q_robot = (new THREE.Quaternion()).multiplyQuaternions(q,item_mesh_default_rot_inv);
    var rpy = (new THREE.Euler()).setFromQuaternion(q_robot);
    var tr = Transform.three_to_torso(item_mesh.position,Robot)
    tr.push(rpy.z, rpy.x, rpy.y)
    return tr;
  }
  
  // Keypressing hotkeys
  var hotkeys = [
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
  },
  {
    "keys"          : "u",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        item_mesh.position.y += 10;
        World.render();
    },
    "this"          : ctx
  },
  {
    "keys"          : "m",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        item_mesh.position.y -= 10;
        World.render();
    },
    "this"          : ctx
  },
  ];
  
  
  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  // intersection handler
  Hand.select = function(p,r){
    // Set the position
    item_mesh.position.copy(p);
    // Re-render
    World.render();
  }
  // reset the hand
  Hand.clear = function(){
    // reset the transform
    qwest.get( rpc_url_rget ).success(function(model){
      // Convert the position to THREEjs
      model_to_three(model);
    });
  }
  // loop modify handles
  Hand.loop = function(tcontrol){
    
  }
  // enter stage
  Hand.init = function(tcontrol){
    // Grab the current transform
    qwest.get( rpc_url_rget ).success(function(model){
      // Convert the position to THREEjs
      model_to_three(model);
      // Must update the position of the transform controls
      tcontrol.update();
    });
    // Add to the world
    World.add(item_mesh);
    // Re-render
    World.render();
    // register keypresses
    keypress.register_many(hotkeys);
  }
  // exit stage
  Hand.deinit = function(){
    keypress.unregister_many(hotkeys);
    World.remove(item_mesh);
  }
  // send to robot
  Hand.send = function(){
    // Acquire the model
    var model = three_to_model();
    qwest.post( rpc_url_rset, {val:JSON.stringify(model)} );
  }
  Hand.mod_callback = function(){
    
  }
  // get the mesh
  Hand.get_mesh = function(){
    return item_mesh;
  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  Hand.item_name = 'Hand';
  // export
	ctx.Hand = Hand;

})(this);