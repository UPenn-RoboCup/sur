/*****
 * 3D wheel model
 */
(function(ctx){
  
  // Function to hold methods
  function Waypoint(){}
  // For manipulation
  Waypoint.item_name = 'Wheel';
  var wp = new THREE.Vector3();
  
  // make the waypoint
  var wp_mat  = new THREE.MeshLambertMaterial({color: 0xFF0000});
  var wp_path    = new THREE.Path();
  wp_path.fromPoints([
    new THREE.Vector2(0,100),
    new THREE.Vector2(-50,-20),
    new THREE.Vector2(-20,0),
    new THREE.Vector2(20,0),
    new THREE.Vector2(50,-20),
    //new THREE.Vector2(-50,0),
  ]);
  var wp_shape = wp_path.toShapes();
  var wp_geo  = new THREE.ExtrudeGeometry(
    wp_shape, {}
  );
  var wp_mesh = new THREE.Mesh( wp_geo, wp_mat );
  console.log(wp_mesh)
  wp_mesh.quaternion.setFromEuler(
    new THREE.Euler( Math.PI/2, 0, 0 )
  );

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
  
  ///////////////////////
  // object manipulation API
  // set up the intersection handler
  // point in THREEjs: p
  // point in robot: r
  Waypoint.select = function(p,r){
    wp.x = r[0];
    wp.y = r[1];
    // no wp.a yet
    wp_mesh.position.copy(p);
    // Always above ground a bit
    wp_mesh.position.y = 100;
    
    World.add( wp_mesh );
    // Send the hcm values to the robot
    //var rpc_url = rest_root+'/m/hcm/wheel/model'
    //qwest.post( rpc_url, {val:JSON.stringify(hcm_wheel)} );
    // DEBUG
    console.log('wp',p,r);
    // Re-render
    World.render();
  }
  Waypoint.clear = function(){
    // Clear the point
    World.remove( wp_mesh );
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
    tcontrol.attach( wp_mesh );
    World.add( tcontrol );
    // listen for a keydown
    ctx.addEventListener( 'keydown', update_tcontrol, false );
    // Re-render
    World.render();
  }; // start_modify
  Waypoint.stop_modify = function(){
    if(tcontrol===null){return;}
    World.remove( tcontrol );
    tcontrol.detach( wp_mesh );
    tcontrol.removeEventListener( 'change', World.render );
    tcontrol = null;
    ctx.removeEventListener( 'keydown', update_tcontrol, false );
    World.enable_orbit();
    // re-render
    World.render();
  }
  ///////////////////////

  // export
	ctx.Waypoint = Waypoint;

})(this);