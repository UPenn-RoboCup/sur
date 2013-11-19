/*****
 * 3D wheel model
 */
(function(ctx){
  
  // Function to hold methods
  function Waypoint(){}
  var wp = [0,0,0];
  // Sending to the robot
  var rpc_url = rest_root+'/m/hcm/motion/waypoints'
  
  // make the waypoint
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
  
  ///////////////////////
  // object manipulation API
  // set up the intersection handler
  // point in THREEjs: p
  // point in robot: r
  Waypoint.select = function(p,r){
    wp[0] = r[0];
    wp[1] = r[1];
    // keep the same pose as the robot on the initial click
    wp[2] = Robot.pa;
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
    //
    item_angle.setFromQuaternion(item_mesh.quaternion);
    item_angle.x = Math.PI/2;
    item_angle.y = 0;
    item_mesh.quaternion.setFromEuler( item_angle );
    //
    item_mesh.position.y = 100;
    //
    wp[0] = item_mesh.position.z/1000; // x
    wp[1] = item_mesh.position.x/1000; // y
    wp[2] = -item_angle.z; // a
  }
  // send to robot
  Waypoint.send = function(){
    qwest.post( rpc_url, {val:JSON.stringify(wp)} );
  }
  // get the mesh
  Waypoint.get_mesh = function(){
    return item_mesh;
  }

  Waypoint.item_name = 'Waypoint';
  // export
	ctx.Waypoint = Waypoint;

})(this);