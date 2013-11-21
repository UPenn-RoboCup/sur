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
  var item_mat  = new THREE.MeshLambertMaterial({color: 0xFF0000});
  var item_path = new THREE.Path();
  item_path.fromPoints([
    new THREE.Vector2(0,0), // tip of the arrow
    new THREE.Vector2(-50,-120),
    new THREE.Vector2(-20,-100),
    new THREE.Vector2(20,-100),
    new THREE.Vector2(50,-120),
  ]);
  var item_shape = item_path.toShapes();
  var item_geo  = new THREE.ExtrudeGeometry(
    item_shape, {}
  );
  var item_mesh  = new THREE.Mesh( item_geo, item_mat );
  var item_angle = new THREE.Euler( Math.PI/2, 0, 0 )
  item_mesh.quaternion.setFromEuler( item_angle );
  // Set above the ground
  item_mesh.position.y = 100;
  
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
    var pa = -1*item_mesh.rotation.z;
    // Pose_local to pose_global
    return [px,py,pa];
  }
  var model_to_three = function(model){

  }
  
  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  Waypoint.select = function(p,r){
    // Put the mesh in the right position (no orientation change)
    item_mesh.position.copy(p);
    // Always above ground a bit
    item_mesh.position.y = 100;
    // Send the waypoint to robot when selecting
    Waypoint.send();
    // Re-render
    World.render();
  }
  // TODO: reset from SHM?
  Waypoint.clear = function(){
  }
  // enter
  Waypoint.init = function(){
    World.add( item_mesh );
  }
  //exit
  Waypoint.deinit = function(){
    World.remove( item_mesh );
  }
  // Constrain the angles to 2D (i.e. one angle)
  Waypoint.mod_callback = function(){
    // Retain the same angles
    item_mesh.rotation.x = Math.PI/2;
    item_mesh.rotation.y = 0;
    // Retain the same height
    item_mesh.position.y = 100;
  }
  // send to robot
  Waypoint.send = function(){
    // Waypoint model
    var wp = three_to_model();
    qwest.post( rpc_url, {val:JSON.stringify(wp)} );
    // One waypoint
    qwest.post( rpc_url_n, {val:JSON.stringify(1)} );
    // Global wp
    qwest.post( rpc_url_fr, {val:JSON.stringify(1)} );
  }
  // get the mesh
  Waypoint.get_mesh = function(){
    return item_mesh;
  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  Waypoint.item_name = 'Waypoint';
	ctx.Waypoint = Waypoint;

})(this);