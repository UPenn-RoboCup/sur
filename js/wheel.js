/*****
 * 3D wheel model
 */
(function(ctx){
  
  // Function to hold methods
  function Wheel(){}
  // For manipulation
  Wheel.item_name = 'Wheel';
  
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
    // better names for the intersection points
    var left  = ipoints[0];
    var right = ipoints[1];
    var top   = ipoints[2];
    
    // Find the center of the wheel
    var center = new THREE.Vector3();
    center.addVectors( left, right ).divideScalar(2);
    // test for the distance to the wheel
    var min_dist = .1, max_dist = 1;
    var rel_x = center.x;
    if(rel_x > 1 || rel_x < 0.10){
      // x distance in meters
      console.log(sprintf("Handle is too far or too close: %.3f < %.3f < %.3f", min_dist,rel_x,max_dist));
      //return;
    }
    // Find the radius of the wheel
    var diff   = (new THREE.Vector3()).subVectors( left, right );
    var radius = diff.length()/2;
    // fudge factor of 1cm for the radius
    radius += 0.020;
    // Check the radius
    var min_rad = .1, max_rad = 1;
    if (radius>max_rad || radius<min_rad){
      // radius in meters
      console.log(sprintf("Handle is too small or too big: %.3f < %.3f < %.3f", min_rad,radius,max_rad));
      //return;
    }
    // find the yaw/pitch of the wheel
    var yaw = Math.atan2( diff.y, diff.x ) - Math.PI/2;
    //
    var pitch_diff = (new THREE.Vector3()).subVectors(top,center);
    var pitch = Math.atan2( pitch_diff.x, pitch_diff.z);
    
    // Vector3's log
    /*
    console.log('left',left);
    console.log('right',right);
    console.log('top',top);
    console.log('center',center);
    console.log('diff',diff);
    */
    
    // Modify the geometry of the helper
    // Good gut check on the transform, since this should line up well
    wheel_geo  = new THREE.TorusGeometry(1000*radius, 20, 8, 20);
    wheel_mesh = new THREE.Mesh( wheel_geo, wheel_mat );
    var tp = Transform.torso_to_three(rel_x, center.y, center.z, Robot);
    wheel_mesh.position.fromArray(tp);
    wheel_mesh.rotation.set(pitch+Robot.bodyTilt,yaw,0);
    
    // Format data for hcm
    return [rel_x, center.y, center.z, yaw, pitch, radius];
  }
  
  ///////////////////////
  // object manipulation API
  // set up the intersection handler
  // point in THREEjs: p
  // point in robot: r
  Wheel.select = function(p,r){
    //console.log(p,r);
    // Save the point (only the robot frame)
    ipoints.push((new THREE.Vector3()).fromArray(r));
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
      qwest.post( rpc_url, {val:JSON.stringify(hcm_wheel)} );
    }
    // Re-render
    World.render();
  }
  Wheel.clear = function(){
    // remove indicators
    for(var i=0;i<nIndicators;i++){World.remove(indicators[i]);}
    // Reset the intersection points
    ipoints = [];
    // Remove the wheel
    World.remove(wheel_mesh);
    // Stop modifying
    Wheel.stop_modify();
    // Re render the scene
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
    // Re-render
    World.render();
  }; // start_modify
  Wheel.stop_modify = function(){
    if(tcontrol===null){return;}
    World.remove( tcontrol );
    tcontrol.detach( wheel_mesh );
    tcontrol.removeEventListener( 'change', World.render );
    tcontrol = null;
    ctx.removeEventListener( 'keydown', update_tcontrol, false );
    World.enable_orbit();
    // re-render
    World.render();
  }
  ///////////////////////

  // export
	ctx.Wheel = Wheel;

})(this);