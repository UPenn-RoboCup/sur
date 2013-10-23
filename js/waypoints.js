// http://stackoverflow.com/questions/17044070/three-js-cast-an-picking-array
var select_footstep = function(event){
  // find the mouse position (use NDC coordinates, per documentation)
  var mouse_vector = new THREE.Vector3(
    ( event.offsetX / CANVAS_WIDTH ) * 2 - 1,
    -( event.offsetY / CANVAS_HEIGHT ) * 2 + 1);
  //console.log('Mouse',mouse_vector); // need Vector3, not vector2

  var projector = new THREE.Projector();
  //console.log('projector',projector)
  var raycaster = projector.pickingRay(mouse_vector,camera);
  //console.log('picking raycaster',raycaster)

  // intersect the plane
  var intersection = raycaster.intersectObjects( [foot_floor,mesh] );
  // if no intersection
  //console.log(intersection)
  if(intersection.length==0){ return; }

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