(function(ctx){
  
  // Function to hold methods
  function BarValve(){}
  
  //////////////
  // RPC URLs //
  //////////////
  var rpc_url = rest_root+'/m/hcm/barvalve/model';
  
  // Relative waypoint offset in ROBOT coordinates
  // but with THREE scale (mm)
  var offset = new THREE.Vector2(610,240);  // tune this based on claw length
  /////////////////////
  // Mesh definition //
  ///////////////////// 
  // make the wheel (some params known a priori)
  var off_ground = 1010;
  var radius0    = 105;
  var ind_sz     = 10;
  var tube_rad   = 15;
  var item_mesh = new THREE.Mesh(
    new THREE.SphereGeometry(tube_rad),
    new THREE.MeshLambertMaterial({color: 0xAAAAAA})
  );
  // Horizontal Spoke
  var horiz_mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(tube_rad,tube_rad,radius0,12,1),
    new THREE.MeshLambertMaterial({color: 0xAAAAAA})
  );
  horiz_mesh.rotation.set(0, 0, Math.PI/2);
  horiz_mesh.position.x = radius0/2;
  
  // append to the valve
  item_mesh.add(horiz_mesh);
  
  //
  var stop_mat  = new THREE.MeshLambertMaterial({color: 0xFF0000});
  var stop_path = new THREE.Path();
  stop_path.fromPoints([
    new THREE.Vector2(0,0), // tip of the arrow
    new THREE.Vector2(-tube_rad,radius0-tube_rad),
    new THREE.Vector2(0,radius0),
    new THREE.Vector2(tube_rad,radius0-tube_rad),
  ]);
  var stop_shape = stop_path.toShapes();
  var stop_geo  = new THREE.ExtrudeGeometry(
    stop_shape, {amount: ind_sz}
  );
  var stop_mesh  = new THREE.Mesh( stop_geo, stop_mat );
  stop_mesh.position.setZ(-ind_sz/2);
  stop_mesh.rotation.set(0, 0, Math.PI/2);
  // append to the valve
  item_mesh.add(stop_mesh);
  
  var mod_mesh = item_mesh;
  
  //////////////////////
  // Model converters //
  //////////////////////
  var three_to_model = function(){
    var roll_start = start_mesh.rotation.z;
    var roll_end = stop_mesh.rotation.z;
    var p = Transform.three_to_torso(item_mesh.position,Robot);
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
  BarValve.select = function(p,r){
    
    // Set the position from the double click
    item_mesh.position.copy(p);
  
    wp_callback();
    BarValve.send();
    // Re-render
    

  }
  // modification loop
  BarValve.loop = function(tcontrol){
    if(Manipulation.is_mod==false){return;}
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
  BarValve.send = function(){
    var model = three_to_model();
    qwest.post( rpc_url, {val:JSON.stringify(model)} );
  }
  // enter
  BarValve.init = function(){
    World.add(item_mesh);
    qwest.get( rpc_url,{},{},function(){
      // Use a 1 second timeout for the XHR2 request for getting the model
      this.timeout = 1000; // ms
    })
    .success(function(model){
      model_to_three(model);
      mod_mesh = item_mesh;
    });
  }
  // exit
  BarValve.deinit = function(){
    World.remove(item_mesh);
  }
  BarValve.get_mod_mesh = function(){
    return mod_mesh;
  }
  BarValve.mod_callback = function(){
    // Retain the same angles
    item_mesh.rotation.x = 0;
    item_mesh.rotation.y = 0;
    //
    stop_mesh.rotation.x = 0;
    stop_mesh.rotation.y = 0;
    // Retain the same height
    item_mesh.position.y = off_ground;

    wp_callback();
  }
  BarValve.special = function(dir){
    // Move the roll
    item_mesh.rotation.z += dir*.1;
    wp_callback();
    SmallValve.send();
  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  BarValve.item_name = 'Bar Valve';
  BarValve.grab_evt = 'smallvalvegrab';
  // export
	ctx.BarValve = BarValve;

})(this);
