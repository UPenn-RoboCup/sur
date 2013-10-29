/*****
 * 3D wheel model
 */
(function(ctx){
  
  // Function to hold methods
  function Wheel(){}
  
  // Have the world
  Wheel.world = null;
  // save the intersection points
  var ipoints = [];
  
  // make the wheel
  var wheel_geo  = new THREE.TorusGeometry();
  var wheel_mat  = new THREE.MeshLambertMaterial({color: 0x5C5858});
  var wheel_mesh = new THREE.Mesh( wheel_geo, wheel_mat );
  // make the indicators
  var indicator_geo  = new THREE.OctahedronGeometry(25);
  var indicator_mat  = new THREE.MeshLambertMaterial({color: 0xFDD017});
  var indicators = [];
  var nIndicators = 3;
  for(var i=0;i<nIndicators;i++){
    indicators.push(new THREE.Mesh(indicator_geo, indicator_mat) );
  }
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
  
  // Find the wheel parameters based on three clicked points
  var calculate = function(){
    var left  = ipoints[0];
    var right = ipoints[1];
    var top   = ipoints[2];
    // Find the center of the wheel
    var center = new THREE.Vector3();
    center.addVectors( left, right ).divideScalar(2);
    
    // swap coordinates, since webgl and robot are different
    var rel_x = center.z / 1000;
    var rel_y = center.x / 1000;
    var rel_z = center.y / 1000;
    
    // test for the distance to the wheel
    var min_dist = .1, max_dist = 1;
    if(rel_x > 1 || rel_x < 0.10){
      // x distance in meters
      console.log(sprintf("Handle is too far or too close: %.3f < %.3f < %.3f", min_dist,rel_x,max_dist));
      //return;
    }
    // Find the radius of the wheel
    var diff = new THREE.Vector3();
    diff.subVectors( left, right );
    var radius = (diff.length()/2) / 1000;
    var min_rad = .1, max_rad = 1;
    if (radius>max_rad || radius<min_rad){
      // radius in meters
      console.log(sprintf("Handle is too small or too big: %.3f < %.3f < %.3f", min_rad,radius,max_rad));
      //return;
    }
    // find the yaw/pitch of the wheel
    // NOTE: Calculation done with webgl/THREEjs coordinates
    var dx = diff.z, dy = diff.x;
    var yaw = Math.atan2( dy, dx ) - Math.PI/2;
    
    //
    var pitch_diff = new THREE.Vector3();
    pitch_diff.subVectors(top,center);
    dx = pitch_diff.z, dz = pitch_diff.y;
    var pitch = Math.atan2( dx, dz);
    
    // Modify the geometry of the helper
    wheel_geo = new THREE.TorusGeometry(1000*radius, 20, 8, 20);
    wheel_mesh = new THREE.Mesh( wheel_geo, wheel_mat );
    wheel_mesh.position.copy(center);
    wheel_mesh.rotation.set(pitch,yaw,0);
    
    // Vector3's log
    /*
    console.log('left',left);
    console.log('right',right);
    console.log('top',top);
    console.log('center',center);
    console.log('diff',diff);
    */
    
    // Format data for hcm
    pitch -= bodyTilt;
    rel_y = 0; // hack
    rel_x -= supportX; // hack or correct?
    rel_z -= bodyHeight0;
    radius += 0.010; // fudge factor of 1cm for the radius
    return [rel_x, rel_y, rel_z, yaw, pitch, radius];
  }
  
  // set up the intersection handler
  Wheel.select = function(intersections){
    // Just take the first intersection point
    var p = intersections[0].point;
    // Save the point
    ipoints.push(p);
    var nI = ipoints.length;
    // Do not calculate if no points
    if(nI<nIndicators){
      // Add an indicator
      var cur_ind = indicators[nI-1];
      cur_ind.position.copy(p);
      // Remove the previous torus
      World.remove(wheel_mesh);
      // Add to the scene
      World.add( cur_ind );
      // stop modify
      Wheel.stop_modify();
    } else {
      // Calculate the wheel
      var hcm_wheel = calculate();
      // Remove the indicators
      for(var i=0;i<nIndicators;i++){
        World.remove(indicators[i]);
      }
      // Reset the intersection points
      ipoints = [];
      console.log('hcm wheel',hcm_wheel);
      // Add to the scene
      World.add( wheel_mesh );
      // Send the hcm values to the robot
      var rpc_url = rest_root+'/m/hcm/wheel/model'
      promise.post( rpc_url, {val:JSON.stringify(hcm_wheel)} );
      // modify the mesh (works)
      Wheel.start_modify();
    }
    // Re-render
    World.render();
  }
  
  Wheel.start_modify = function(){
    // stop the normal controls
    World.disable_orbit();
    // grab a tcontrol
    tcontrol = World.generate_tcontrol();
    // Setup the transformcontrols
    tcontrol.addEventListener( 'change', World.render );
    tcontrol.attach( wheel_mesh );
    World.add( tcontrol );
    // listen for a keydown
    ctx.addEventListener( 'keydown', update_tcontrol, false );
  }; // start_modify
  
  Wheel.stop_modify = function(){
    if(tcontrol===null){return;}
    World.remove( tcontrol );
    tcontrol.removeEventListener( 'change', World.render );
    tcontrol = null;
    ctx.removeEventListener( 'keydown', update_tcontrol, false );
    World.enable_orbit();
  }

  // export
	ctx.Wheel = Wheel;

})(this);