(function(ctx){
  
  // Function to hold methods
  function Hose(){}

  //////////////
  // RPC URLs //
  //////////////
  var rpc_url = rest_root+'/m/hcm/hose/model';

  // Relative waypoint offset in ROBOT coordinates
  // but with THREE scale (mm)
  var offset = new THREE.Vector2(450,90);
  
  /////////////////////
  // Mesh definition //
  /////////////////////
  var item_angle = new THREE.Euler();
  // master
  var item_mat = new THREE.MeshLambertMaterial({color: 0xAAAAAA});
  var item_geo = new THREE.CylinderGeometry(44.5,44.5,25.4,12,1,false);
  var item_mesh = new THREE.Mesh( item_geo, item_mat );
  // Non-spinning piece
  var no_spin_mat = new THREE.MeshLambertMaterial({color: 0x444444});
  var no_spin_geo = new THREE.CylinderGeometry(44.5,44.5,50.0,12,1,false);
  var no_spin_mesh = new THREE.Mesh( no_spin_geo, no_spin_mat );
  no_spin_mesh.position.y = 25.4/2 + 50/2;
  // Mesh Tube
  var tube_mat = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
  var tube_geo = new THREE.CubeGeometry(80,100,10);
  var tube_mesh = new THREE.Mesh( tube_geo, tube_mat );
  tube_mesh.position.y = 50.0/2 + 60/2;
  // North Nub
  var nub_mat = new THREE.MeshBasicMaterial({color: 0x888888});
  var nub_geo = new THREE.CubeGeometry(10,25.4,10);
  var nub_mesh = new THREE.Mesh( nub_geo, nub_mat );
  nub_mesh.position.z = 44.4 + 10/2;
  // Scene graph time!
  no_spin_mesh.add(tube_mesh);
  item_mesh.add(no_spin_mesh);
  item_mesh.add(nub_mesh);
  
  //////////////////////
  // Model converters //
  //////////////////////
  var three_to_model = function(){
    // Acquire the model
    item_angle.setFromQuaternion(item_mesh.quaternion);
    // Points in THREEjs to torso frame
    var model = Transform.three_to_torso(item_mesh.position,Robot);
    //model.push(item_angle.y);
    model.push(0);
    // pitch
    model.push(0);
    console.log('Hose',model);
    return model;
  }
  var model_to_three = function(model){
    var p = Transform.torso_to_three(model[0],model[1],model[2],Robot);
    item_mesh.position.fromArray(p);
    // Do not care about yaw yet
  }
  
  // Adjust the waypoint to the *perfect* position
  var wp_callback = function(){
    // Grab the (global) orientation of the mesh
    var pa = item_mesh.rotation.y;
    // Acquire the position of the tip:
    var p = (new THREE.Vector3()).copy(item_mesh.position);
    
    // Make the global offset from the object
    var ca = Math.cos(pa), sa = Math.sin(pa);
    var dx = offset.x*ca - offset.y*sa;
    var dy = offset.y*ca + offset.x*sa;

    // Change the THREE coordinates of the desired waypoint
    p.x -= dy;
    p.z -= dx;

    // Update the Waypoint in the scene
    Waypoint.set(p,pa);

  }

  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  Hose.select = function(p,r){
    // Set the position
    item_mesh.position.copy(p);
    Hose.mod_callback();
    Hose.send();
  }
  Hose.init = function(){
    // Add to the world
    World.add(item_mesh);
    Hose.loop();
  }
  Hose.deinit = function(){
    // Add to the world
    World.remove(item_mesh);
  }
  Hose.send = function(){
    var model = three_to_model();
    qwest.post( rpc_url, {val:JSON.stringify(model)} );
  }
  Hose.get_mod_mesh = function(){
    return item_mesh;
  }
  Hose.loop = function(){
    // Get the model from the robot (could be pesky...?)
    qwest.get( rpc_url,{},{},function(){
      // Use a 1 second timeout for the XHR2 request for getting the model
      this.timeout = 1000; // ms
    })
    .success(function(model){
      model_to_three(model);
      Hose.mod_callback();
    })
  }
  Hose.mod_callback = function(){
    wp_callback();
  }
  Hose.gen_wp = function(){
    // yield the optimal waypoint
  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  Hose.item_name = 'Hose';
  // export
	ctx.Hose = Hose;

})(this);