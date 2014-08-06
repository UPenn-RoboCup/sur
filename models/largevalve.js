(function(ctx){
  
  // Function to hold methods
  function LargeValve(){}
  
  //////////////
  // RPC URLs //
  //////////////
  var rpc_url = rest_root+'/m/hcm/largevalve/model'

  // Relative waypoint offset in ROBOT coordinates
  // but with THREE scale (mm)
  //var offset = new THREE.Vector2(690,270);
  var offset = new THREE.Vector2(840,270);
  
  /////////////////////
  // Mesh definition //
  /////////////////////
  // make the wheel (some params known a priori)
  var off_ground = 1010;
  var radius0  = 220;
  var ind_sz   = 10;
  var tube_dia = 25/2;
  var item_geo = new THREE.TorusGeometry(radius0, tube_dia, 8, 20 );
  var item_mat = new THREE.MeshLambertMaterial({color: 0x5C5858});
  // Vertical spoke
  var vert_mesh = new THREE.Mesh(new THREE.CylinderGeometry(tube_dia/2,tube_dia/2,2*radius0,12,1));
  // Horizontal Spoke
  var horiz_mesh = new THREE.Mesh(new THREE.CylinderGeometry(tube_dia/2,tube_dia/2,2*radius0,12,1));
  horiz_mesh.rotation.set(0, 0, Math.PI/2);
  // Full mesh
  THREE.GeometryUtils.merge( item_geo, vert_mesh );
  THREE.GeometryUtils.merge( item_geo, horiz_mesh );
  var item_mesh = new THREE.Mesh( item_geo, item_mat );
  item_mesh.position.y = off_ground;
  // Roll indicators should be a submesh
  var start_mat  = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
  var start_path = new THREE.Path();
  start_path.fromPoints([
    new THREE.Vector2(0,0), // tip of the arrow
    new THREE.Vector2(-tube_dia,radius0-tube_dia),
    new THREE.Vector2(0,radius0),
    new THREE.Vector2(tube_dia,radius0-tube_dia),
  ]);
  var start_shape = start_path.toShapes();
  var start_geo  = new THREE.ExtrudeGeometry(
    start_shape, {amount: ind_sz}
  );
  var start_mesh  = new THREE.Mesh( start_geo, start_mat );
  start_mesh.position.setZ(-ind_sz/2);
  //
  var stop_mat  = new THREE.MeshLambertMaterial({color: 0xFF0000});
  var stop_path = new THREE.Path();
  stop_path.fromPoints([
    new THREE.Vector2(0,0), // tip of the arrow
    new THREE.Vector2(-tube_dia,radius0-tube_dia),
    new THREE.Vector2(0,radius0),
    new THREE.Vector2(tube_dia,radius0-tube_dia),
  ]);
  var stop_shape = stop_path.toShapes();
  var stop_geo  = new THREE.ExtrudeGeometry(
    stop_shape, {amount: ind_sz}
  );
  var stop_mesh  = new THREE.Mesh( stop_geo, stop_mat );
  stop_mesh.position.setZ(-ind_sz/2);
  stop_mesh.rotation.set(0, 0, Math.PI/2);
  // append to the valve
  item_mesh.add(start_mesh);
  item_mesh.add(stop_mesh);
  
  // Mesh that is undergoing modification
  var mod_mesh = item_mesh;
  // Item mesh remains always the base mesh
  
  //////////////////////
  // Model converters //
  //////////////////////
  var three_to_model = function(){
    var roll_start = start_mesh.rotation.z;
    var roll_end = stop_mesh.rotation.z;
    var p = Transform.three_to_torso(item_mesh.position,Robot);
    p.push(radius0/1000);
    p.push(roll_start);
    p.push(roll_end);
    return p;
  }
  var model_to_three = function(model){
    // {pos(3) roll_start roll_end}
    var p = Transform.torso_to_three(model[0],model[1],model[2],Robot);
    item_mesh.position.fromArray(p);
    
    // apply some yaw based upon our pose
    var q_pose = (new THREE.Quaternion()).setFromAxisAngle(
      (new THREE.Vector3(0,1,0)), Robot.pa );
    var q_item = (new THREE.Quaternion()).setFromEuler(item_mesh.rotation);
    var q_yaw = (new THREE.Quaternion()).multiplyQuaternions(q_pose,q_item);
    item_mesh.rotation.setFromQuaternion(q_yaw);
    
    var roll_start = model[3];
    var roll_end   = model[4];
    start_mesh.rotation.set(0, 0, roll_start);
    stop_mesh.rotation.set(0, 0, roll_end);
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
  LargeValve.select = function(p,r){
    // Set the position from the double click
    item_mesh.position.copy(p);
    wp_callback();
    // LargeValve.send();
  }
  // modification loop
  LargeValve.loop = function(tcontrol){
    if(Manipulation.is_mod==false){
      //qwest.get(rpc_url,{},{}).success(function(model){model_to_three(model);});
      return;
    }
    // cycle the tcontrol
    if(mod_mesh===item_mesh){
      tcontrol.detach( item_mesh );
      mod_mesh = start_mesh;
    } else if(mod_mesh===start_mesh){
      tcontrol.detach( start_mesh );
      mod_mesh = stop_mesh;
    } else {
      tcontrol.detach( stop_mesh );
      mod_mesh = item_mesh;
    }
    tcontrol.attach( mod_mesh );
    tcontrol.update();
  }
  // send data to the robot
  LargeValve.send = function(){
    //var model = three_to_model();
    //qwest.post( rpc_url, {val:JSON.stringify(model)} );
    //Waypoint.send();
    // console.log('Sent largevalve',model);
  }
  // enter
  LargeValve.init = function(){
    World.add(item_mesh);
    mod_mesh = item_mesh;
  }
  // exit
  LargeValve.deinit = function(){
    World.remove(item_mesh);
  }
  LargeValve.get_mod_mesh = function(){
    return mod_mesh;
  }
  LargeValve.mod_callback = function(){
    // Retain the same angles
    item_mesh.rotation.x = 0;
    //item_mesh.rotation.y = 0;
    start_mesh.rotation.x = 0;
    start_mesh.rotation.y = 0;
    stop_mesh.rotation.x = 0;
    stop_mesh.rotation.y = 0;
    // Retain the same height
    //item_mesh.position.y = off_ground;
    // Update the global waypoint
    wp_callback();
  }
  LargeValve.special2 = function(dir){
    // Move the roll
    start_mesh.rotation.z += dir*.1;
    stop_mesh.rotation.z  += dir*.1;
    LargeValve.mod_callback();
  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  LargeValve.item_name = 'Valve';
  // export
	ctx.LargeValve = LargeValve;

})(this);