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
  
  // Find the wheel parameters based on three clicked points
  var calculate = function(){
    console.log(ipoints);
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
    console.log('left',left);
    console.log('right',right);
    console.log('top',top);
    console.log('center',center);
    console.log('diff',diff);
    
    // Format data for hcm
    radius += 0.010; // fudge factor of 1cm for the radius
    return [rel_x, rel_y, rel_z-bodyHeight0, yaw, pitch, radius];
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
    }
    // Re-render
    World.render();
  }
  
  Wheel.setup = function(world){
    //Wheel.world = world;
  }

  

  // export
	ctx.Wheel = Wheel;

})(this);

/*

// http://stackoverflow.com/questions/17044070/three-js-cast-an-picking-array
var select_footstep = function(intersection){
  // record the position
  var placement = intersection[0].point;
  //console.log(placement);
  // make a new footstep
  var new_footstep = new THREE.Mesh( foot_geo, foot_mat );
  scene.add(new_footstep)
  // Save the footstep
  new_footstep.position.copy(placement);
  var pos = new_footstep.position;
  new_footstep.robot_frame = new THREE.Vector3(pos.z/1000,pos.x/1000,pos.y/1000);
  foot_steps.push(new_footstep);
  controls.enabled = false;
  // add the transform controls
  var control = new THREE.TransformControls( camera, renderer.domElement );
  control.addEventListener( 'change', render );
  // attach to the mesh
  control.attach( new_footstep );
  scene.add( control );
  tcontrols.push( control );
  
  // add the listener (TODO: add and remove the listener)
  window.addEventListener( 'keydown', function ( event ) {
    //console.log(event.which);
    switch ( event.keyCode ) {
      case 81: // Q
        control.setSpace( control.space == "local" ? "world" : "local" );
        break;
      case 87: // W
        control.setMode( "translate" );
        break;
      case 69: // E
        control.setMode( "rotate" );
        break;
      case 82: // R
        control.setMode( "scale" );
        break;
      // size stuff
      case 187:
      case 107: // +,=,num+
              control.setSize( control.size + 0.1 );
              break;
      case 189:
      case 10: // -,_,num-
              control.setSize( Math.max(control.size - 0.1, 0.1 ) );
              break;
    }            
});
  
  // Log all points in our debug zone
  d3.select("#wp_status").selectAll("p")
    .data(foot_steps)
    .enter()
    .append("p")
    .text(function(d) {
      var pos = d.robot_frame;
      // Shared memory segment
      waypoints.push(pos.x);
      waypoints.push(pos.y);
      waypoints.push(0);
      return sprintf('%.2f, %.2f, %.2f',pos.x,pos.y,pos.z);
    });

  // Render the scene now that we have updated the footsteps
  render();
  
}
*/

/*
var add_mesh_buttons = function(){
  
  document.getElementById('clear_wp_btn').addEventListener('click', function() {
  
    for(var i=0;i<foot_steps.length;i++){scene.remove(foot_steps[i]);}
    foot_steps = [];
  
    d3.select("#wp_status").selectAll("p")
    .data(foot_steps).exit().remove();
    
    render();
    
  }, false);
}
*/