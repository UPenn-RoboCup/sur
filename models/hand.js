(function(ctx){
  
  // Function to hold methods
  function Hand(){}

  //////////////
  // RPC URLs //
  //////////////
  var rpc_url_lget = rest_root+'/m/hcm/hands/left_tr';
  var rpc_url_rget = rest_root+'/m/hcm/hands/right_tr';
  
  // Specials
Hand.special = 0;
  //
  var cur_l = [0,0,0,0,0];
  var cur_r = [0,0,0,0,0];
  
  /////////////////////
  // Mesh definition //
  /////////////////////
  
  // Left Hand
  var left_mat  = new THREE.MeshPhongMaterial({
    ambient: 0x555555,
    specular: 0x111100,
    emissive: 0x000088,
    shininess: 200,
    color: 0x00FF00,
    side: THREE.DoubleSide,
    wireframe: true
  });
  var ind_len = 50;
  var left_geo   = new THREE.CylinderGeometry(8, 8, ind_len, 8, 1, false);
  var left1_geo  = left_geo.clone();
  var left1_mesh = new THREE.Mesh( left1_geo, left_mat );
  left1_mesh.rotation.set(Math.PI/2,0,0);
  left1_mesh.position.set(0,0,0);
  //
  var left2_geo  = left_geo.clone();
  var left2_mesh = new THREE.Mesh( left2_geo, left_mat );
  left2_mesh.rotation.set(0,0,Math.PI/2);
  left2_mesh.position.set(0,0,0);
  //
  var left_mesh = new THREE.Mesh( left_geo, left_mat );
  left_mesh.add(left1_mesh);
  left_mesh.add(left2_mesh);
  
  // chopstick helpers
  var chop_off = 50;
  var chop_len = 100;
  var left1a_geo   = new THREE.CylinderGeometry(5, 5, chop_len, 8, 1, false);
  var left1a_mesh = new THREE.Mesh( left1a_geo, left_mat );
  left1a_mesh.rotation.set(Math.PI/2,0,0);
  left1a_mesh.position.set(0,chop_off,0);
  //
  var left1b_mesh = new THREE.Mesh( left1a_geo.clone(), left_mat );
  left1b_mesh.rotation.set(Math.PI/2,0,0);
  left1b_mesh.position.set(0,-chop_off,0);
  //
  left_mesh.add(left1a_mesh);
  left_mesh.add(left1b_mesh);
  
  // Right Hand
  var right_mat  = new THREE.MeshPhongMaterial({
    ambient: 0x555555,
    specular: 0x111100,
    emissive: 0x000088,
    shininess: 200,
    color: 0xFF0000,
    side: THREE.DoubleSide,
    wireframe: true
  });
  var right_geo   = new THREE.CylinderGeometry(8, 8, 80, 8, 1, false);
  var right1_geo  = right_geo.clone();
  var right1_mesh = new THREE.Mesh( right1_geo, right_mat );
  right1_mesh.rotation.set(Math.PI/2,0,0);
  right1_mesh.position.set(0,0,0);
  // lefty
  var offy = 12; // 2cm
  var szy = 200;
  var isaa = szy/2*Math.sqrt(2)/2 /2
  var right1a_geo   = new THREE.CylinderGeometry(5, 5, szy, 8, 1, false);
  var right1a_mesh = new THREE.Mesh( right1a_geo, right_mat );
  right1a_mesh.rotation.set(Math.PI/2,0,Math.PI/4);
  right1a_mesh.position.set(offy-isaa,0,offy+isaa);
  // pushy
  var offz = 65;
  var topsy = 55;
  var right1c_geo   = new THREE.CylinderGeometry(5, 5, 2*2*offy*Math.sqrt(2), 8, 1, false);
  var right1c_mesh = new THREE.Mesh( right1c_geo, right_mat );
  right1c_mesh.rotation.set(Math.PI/2,0,-Math.PI/4);
  right1c_mesh.position.set(-offz,topsy,offz);
  
  //
  var right2_geo  = right_geo.clone();
  var right2_mesh = new THREE.Mesh( right2_geo, right_mat );
  right2_mesh.rotation.set(0,0,Math.PI/2);
  right2_mesh.position.set(0,0,0);
  //
  //THREE.GeometryUtils.merge( right_geo, right1_geo );
  //THREE.GeometryUtils.merge( right_geo, right2_geo );
  var right_mesh = new THREE.Mesh( right_geo, right_mat );
  right_mesh.add(right1_mesh);
  right_mesh.add(right2_mesh);
  //
  right_mesh.add(right1a_mesh);
  right_mesh.add(right1c_mesh);
  
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
      // rset the hand positions
      if(cur_hand=='left'){
        qwest.get( rpc_url_lget ).success(function(lmodel){
          cur_l = lmodel.slice();
          model_to_three(cur_l,'left');
          console.log('Left Hand',cur_l);
        });
      } else {
        qwest.get( rpc_url_rget ).success(function(rmodel){
          cur_r = rmodel.slice();
          model_to_three(cur_r,'right');
          console.log('Right Hand',cur_r);
        });
      }
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
    Manipulation.modify('no');
    // Add to the world
    World.add(left_mesh);
    World.add(right_mesh);
  }
  // exit stage
  Hand.deinit = function(){
    //World.remove(left_mesh);
    //World.remove(right_mesh);
  }
  // send to robot
  Hand.send = function(){
    // Acquire the model
    var model = three_to_model(cur_hand);
    var override = [0,0,0, 0,0,0, 0];
// x y z / r p y conditioning
    if(cur_hand=='left') {
      override[0]  = model[0] - cur_l[0];
      override[1]  = model[1] - cur_l[1];
      override[2]  = model[2] - cur_l[2];
//
override[3]  = model[3] - cur_l[3];
override[4]  = model[4] - cur_l[4];
override[5]  = model[5] - cur_l[5];
    } else {
      override[0]  = model[0] - cur_r[0];
      override[1]  = model[1] - cur_r[1];
      override[2]  = model[2] - cur_r[2];
//
override[3]  = model[3] - cur_r[3];
override[4]  = model[4] - cur_r[4];
override[5]  = model[5] - cur_r[5];
    }

// Special
    override[6]  = Hand.special;

console.log('Override!',override);

    // Send the override
qwest.post( so_url, {val:JSON.stringify(override)} )
.success(function(){
Hand.special = 0;
if(cur_hand=='left'){cur_l = model.slice();}else{cur_r = model.slice();}
});

  }
  Hand.mod_callback = function(){
    
  }
  // get the mesh
  Hand.get_mod_mesh = function(){
    return mod_mesh;
  }
  
  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  Hand.item_name = 'Hand';
  // export
  ctx.Hand = Hand;

})(this);
