/*****
 * 3D wheel model
 */
(function(ctx){
  
  // Function to hold methods
  function Waypoint(){}

  //////////////
  // RPC URLs //
  //////////////
  var rpc_url = rest_root+'/m/hcm/motion/waypoints';
  var rpc_url_n = rest_root+'/m/hcm/motion/nwaypoints';
  var rpc_url_fr = rest_root+'/m/hcm/motion/waypoint_frame';
  
  /////////////////////
  // Mesh definition //
  /////////////////////
  var item_mat = new THREE.MeshLambertMaterial({color: 0xFFFF00});
  var item_geo = new THREE.LatheGeometry([
    new THREE.Vector3(   0, 0,    0),
    new THREE.Vector3(  50, 0,  -50),
    new THREE.Vector3(  25, 0,  -50),
    new THREE.Vector3(  25, 0, -125),
    new THREE.Vector3(   0, 0, -125),
  ], 12, -Math.PI, -Math.PI);
  var item_mesh  = new THREE.Mesh( item_geo, item_mat );
  // make the indicators;
  var l_indicator = new THREE.Mesh(
    new THREE.OctahedronGeometry(25),
    new THREE.MeshLambertMaterial({color: 0x2017FD})
  );
  var r_indicator = new THREE.Mesh(
    new THREE.OctahedronGeometry(25),
    new THREE.MeshLambertMaterial({color: 0xFD2017})
  );
  var first_indicator = true;
  
  //////////////////////
  // Model converters //
  //////////////////////
  var three_to_model = function(){
    // Acquire the position of the tip:
    var p = (new THREE.Vector3()).copy(item_mesh.position);
    // Make the robot GLOBAL pose
    var px = p.z / 1000;
    var py = p.x / 1000;
    // Make the robot GLOBAL orientation
    var pa = item_mesh.rotation.y;
    // Pose_local to pose_global
    return [px,py,pa];
  }
  var model_to_three = function(model){
    // Assumption: Global coordinates
    item_mesh.position.x = 1000*model[1];
    item_mesh.position.z = 1000*model[0];
    item_mesh.rotation.y = model[2];
  }
  
  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  Waypoint.select = function(p,r){
    // Send upon done second indicator
    if(first_indicator){
      // Put the mesh in the right position (no orientation change)
      l_indicator.position.copy(p);
    } else {
      // Put the mesh in the right position (no orientation change)
      r_indicator.position.copy(p);
      // Calculate the angle
      var dx = r_indicator.position.z - l_indicator.position.z;
      var dy = l_indicator.position.x - r_indicator.position.x;
      var a = Math.atan2(dx,dy);
      // Set the item rotation
      item_mesh.rotation.y = a;
      item_mesh.position.z = (r_indicator.position.z+l_indicator.position.z)/2;
      item_mesh.position.x = (r_indicator.position.x+l_indicator.position.x)/2;
    }
    // Swap indicators
    first_indicator = !first_indicator;
  }
  // TODO: reset from SHM?
  Waypoint.clear = function(){
  }
  Waypoint.loop = function(){
    // Get the model from the robot
    qwest.get( rpc_url,{},{},function(){/*this.timeout = 10000;*/})
    .success(function(model){
      model_to_three(model);
    })
  }
  // enter
  Waypoint.init = function(){
    first_indicator = true;
    World.add( item_mesh );
    World.add( l_indicator );
    World.add( r_indicator );
  }
  //exit
  Waypoint.deinit = function(){
    World.remove( l_indicator );
    World.remove( r_indicator );
  }
  // Constrain the angles to 2D (i.e. one angle)
  Waypoint.mod_callback = function(){
    // Retain the same angles
    item_mesh.rotation.x = 0;
    item_mesh.rotation.z = 0;
    // Retain the same height
    item_mesh.position.y = 0;
  }
  // send to robot
  Waypoint.send = function(cb){
    // Waypoint model
    var wp = three_to_model();
    console.log('Send wp',wp);
    // For network efficiency, just send the waypoint coordinates
    qwest.post( rpc_url, {val:JSON.stringify(wp)});
    /*
    qwest.post( rpc_url, {val:JSON.stringify(wp)})
    .success(function(){
      // One waypoint
      qwest.post( rpc_url_n, {val:JSON.stringify(1)},function(){
    } ).success(function(){
        // Global wp
        qwest.post( rpc_url_fr, {val:JSON.stringify(1)} ).success(cb);
      })
    });
    */
  }
  // get the mesh
  Waypoint.get_mod_mesh = function(){
    return item_mesh;
  }
  Waypoint.set = function(p,pa){
    item_mesh.position.copy(p);
    item_mesh.position.y = 0;
    item_mesh.rotation.y = pa;
  }
  Waypoint.get_robot = function(){
    return three_to_model();
  }
  Waypoint.add_buttons = function(holder){

  }
  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  Waypoint.item_name = 'Waypoint';
	ctx.Waypoint = Waypoint;

})(this);