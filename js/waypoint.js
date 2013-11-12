/*****
 * 3D wheel model
 */
(function(ctx){
  
  // Function to hold methods
  function Waypoint(){}
  // For manipulation
  Waypoint.item_name = 'Waypoint';
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

  // TransformControl
  var tcontrol = null;
  var update_tcontrol = function ( event ) {
    switch ( event.keyCode ) {
      case 81: // Q
        tcontrol.setSpace( tcontrol.space == "local" ? "world" : "local" );
        break;
      case 87: // W
        tcontrol.setMode( "translate" );
        break;
      case 69: // E
        tcontrol.setMode( "rotate" );
        break;
      case 82: // R
        tcontrol.setMode( "scale" );
        break;
      // size stuff
      case 187:
      case 107: // +,=,num+
        tcontrol.setSize( tcontrol.size + 0.1 );
        break;
      case 189:
      case 10: // -,_,num-
        tcontrol.setSize( Math.max(tcontrol.size - 0.1, 0.1 ) );
        break;
    }
  };
  
  // Constrain the angles to 2D (i.e. one angle)
  var update_angle = function(){
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
    qwest.post( rpc_url, {val:JSON.stringify(wp)} );
    // Re-render
    World.render();
  }
  Waypoint.clear = function(){
    // Stop modifying
    Wheel.stop_modify();
    // Re render the scene
    World.render();
  }
  Waypoint.start_modify = function(){
    // stop the normal controls
    World.disable_orbit();
    // grab a tcontrol
    tcontrol = World.generate_tcontrol();
    // Setup the transformcontrols
    tcontrol.addEventListener( 'change', World.render );
    tcontrol.addEventListener( 'modify', update_angle );
    tcontrol.attach( item_mesh );
    World.add( tcontrol );
    // listen for a keydown
    ctx.addEventListener( 'keydown', update_tcontrol, false );
    // Re-render
    World.render();
  }; // start_modify
  Waypoint.stop_modify = function(){
    if(tcontrol===null){return;}
    World.remove( tcontrol );
    tcontrol.detach( item_mesh );
    tcontrol.removeEventListener( 'change', World.render );
    tcontrol.removeEventListener( 'modify', update_angle );
    tcontrol = null;
    ctx.removeEventListener( 'keydown', update_tcontrol, false );
    World.enable_orbit();
    // re-render
    World.render();
    // Send the waypoint to robot when done modifying
    qwest.post( rpc_url, {val:JSON.stringify(wp)} );
  }
  ///////////////////////
  
  Waypoint.setup = function(){
    // Always presetn in the world
    World.add( item_mesh );
  }

  // export
	ctx.Waypoint = Waypoint;

})(this);