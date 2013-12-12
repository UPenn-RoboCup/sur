(function(ctx){
  
  // Function to hold methods
  function Hand(){}

  //////////////
  // RPC URLs //
  //////////////
  var rpc_url_lget = rest_root+'/m/hcm/hands/left_tr';
  var rpc_url_lset = rest_root+'/m/hcm/hands/left_tr_target';
  //
  var rpc_url_rget = rest_root+'/m/hcm/hands/right_tr';
  var rpc_url_rset = rest_root+'/m/hcm/hands/right_tr_target';
  
  /////////////////////
  // Mesh definition //
  /////////////////////
  
  // Left Hand
  var left_mat  = new THREE.MeshPhongMaterial({
    ambient: 0x555555,
    specular: 0x111100,
    emissive: 0xFFFF00,
    shininess: 200,
    color: 0xFFFF00,
    //side: THREE.DoubleSide,
  });
  var left_geo  = new THREE.CylinderGeometry(25, 25, 100, 8, 1, false);
  var left_mesh = new THREE.Mesh( left_geo, left_mat );
  
  
  
  
  
  // Right Hand
  var right_mat  = new THREE.MeshLambertMaterial({color: 0xFF0000});
  var right_geo  = new THREE.TorusGeometry(40, 25.4, 8, 6, Math.PI);
  var right_mesh = new THREE.Mesh( right_geo, right_mat );
  
  // Default mesh
  var mod_mesh = left_mesh;
  var cur_hand = 'left';

  //////////////////////
  // Model converters //
  //////////////////////
  var model_to_three = function(tr,hand){
    // Make into easy formats
    var pos_array = Transform.torso_to_three(tr[0],tr[1],tr[2],Robot);
    var rot_q = (new THREE.Quaternion()).setFromEuler(new THREE.Euler(tr[4],tr[5],tr[3]));
    
    // Incorporate pose
    var q_pose = (new THREE.Quaternion()).setFromAxisAngle(
      (new THREE.Vector3(0,1,0)), Robot.pa );
    var full_rot = new THREE.Quaternion();
    full_rot.multiplyQuaternions(q_pose,rot_q);

    // Update the correct mesh
    if(hand=='left'){
      left_mesh.rotation.setFromQuaternion(full_rot);
      left_mesh.position.fromArray(pos_array);
    } else {
      right_mesh.rotation.setFromQuaternion(full_rot);
      right_mesh.position.fromArray(pos_array);
    }
  }
  var three_to_model = function(hand){
    // Grab the item model from the correct mesh
    var q, tr;
    if(hand=='left'){
      q = (new THREE.Quaternion()).setFromEuler(left_mesh.rotation);
      tr = Transform.three_to_torso(left_mesh.position,Robot);
    } else {
      q = (new THREE.Quaternion()).setFromEuler(right_mesh.rotation);
      tr = Transform.three_to_torso(right_mesh.position,Robot);
    }
    // Undo the pose orientation
    var q_pose = (new THREE.Quaternion()).setFromAxisAngle(
      (new THREE.Vector3(0,1,0)), Robot.pa );
    var q_pose_inv = q_pose.inverse();
    // Relative
    var q_rel = (new THREE.Quaternion()).multiplyQuaternions(q_pose_inv,q);
    // RPY
    var rpy = (new THREE.Euler()).setFromQuaternion(q_rel);
    tr.push(rpy.z, rpy.x, rpy.y);
    
    console.log('tr',hand,tr,left_mesh.position);
    
    return tr;
  }
  
  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  // intersection handler
  Hand.select = function(p,r){
    // Set the position for the current mesh
    mod_mesh.position.copy(p);
  }
  // reset the hand
  // loop modify handles
  Hand.loop = function(tcontrol){
    if(Manipulation.is_mod==false){
      // Reload the models
      qwest.get( rpc_url_lget ).success(function(lmodel){
        // Convert the position to THREEjs
        model_to_three(lmodel,'left');
        qwest.get( rpc_url_rget ).success(function(rmodel){
          // Convert the position to THREEjs
          model_to_three(rmodel,'right');
        });
      });     
      return;
    }
    // Switch hands
    if(cur_hand=='left') {
      tcontrol.detach( left_mesh );
      cur_hand = 'right';
      mod_mesh = right_mesh;
    } else {
      tcontrol.detach( right_mesh );
      cur_hand = 'left';
      mod_mesh = left_mesh;
    }
    tcontrol.attach( mod_mesh );
    tcontrol.update();
  }
  // enter stage
  Hand.init = function(tcontrol){
    // Grab the current transforms
    qwest.get( rpc_url_lget ).success(function(lmodel){
      // Convert the position to THREEjs
      model_to_three(lmodel,'left');
      qwest.get( rpc_url_rget ).success(function(rmodel){
        // Convert the position to THREEjs
        model_to_three(rmodel,'right');
      });
    });

    // Add to the world
    World.add(left_mesh);
    World.add(right_mesh);
  }
  // exit stage
  Hand.deinit = function(){
    World.remove(left_mesh);
    World.remove(right_mesh);
  }
  // send to robot
  Hand.send = function(){
    // Acquire the model
    var model = three_to_model(cur_hand);
    if(cur_hand=='left') {
      qwest.post( rpc_url_lset, {val:JSON.stringify(model)} );
    } else {
      qwest.post( rpc_url_rset, {val:JSON.stringify(model)} );
    }
  }
  Hand.mod_callback = function(){
    
  }
  // get the mesh
  Hand.get_mod_mesh = function(){
    return mod_mesh;
  }
  
  Hand.add_buttons = function(holder){
    
  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  Hand.item_name = 'Hand';
  // export
	ctx.Hand = Hand;

})(this);