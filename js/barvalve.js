(function(ctx){
  
  // Function to hold methods
  function BarValve(){}
  
  //////////////
  // RPC URLs //
  //////////////
  var rpc_url = rest_root+'/m/hcm/barvalve/model'
  
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
    new THREE.MeshLambertMaterial({color: 0xAA1111})
  );
  // Horizontal Spoke
  var horiz_mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(tube_rad,tube_rad,radius0,12,1),
    new THREE.MeshLambertMaterial({color: 0xEE2222})
  );
  horiz_mesh.rotation.set(0, 0, Math.PI/2);
  horiz_mesh.position.x = radius0/2;
  
  // append to the valve
  item_mesh.add(horiz_mesh);
  
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
  
  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  BarValve.select = function(p,r){
    
    // Set the position from the double click
    item_mesh.position.copy(p);

    // Re-render
    

  }
  // modification loop
  BarValve.loop = function(tcontrol){
    if(Manipulation.is_mod==false){
      // Just reload the model from the robot
      BarValve.clear();
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
  BarValve.send = function(){
    var model = three_to_model();
    qwest.post( rpc_url, {val:JSON.stringify(model)} );
  }
  // clear the item
  BarValve.clear = function(){
    // Get the model from the robot (could be pesky...?)
    qwest.get( rpc_url,{},{},function(){
      // Use a 1 second timeout for the XHR2 request for getting the model
      this.timeout = 1000; // ms
    })
    .success(function(model){
      model_to_three(model);
      mod_mesh = item_mesh;
      
    })
  }
  // enter
  BarValve.init = function(){
    World.add(item_mesh);
  }
  // exit
  BarValve.deinit = function(){
    World.remove(item_mesh);
  }
  BarValve.get_mesh = function(){
    return mod_mesh;
  }
  BarValve.mod_callback = function(){
    // Retain the same angles
    item_mesh.rotation.x = 0;
    item_mesh.rotation.y = 0;
    start_mesh.rotation.x = 0;
    start_mesh.rotation.y = 0;
    stop_mesh.rotation.x = 0;
    stop_mesh.rotation.y = 0;
    // Retain the same height
    item_mesh.position.y = off_ground;
  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  BarValve.item_name = 'Bar Valve';
  BarValve.grab_evt = 'smallvalvegrab';
  // export
	ctx.BarValve = BarValve;

})(this);