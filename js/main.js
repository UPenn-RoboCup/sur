document.addEventListener( "DOMContentLoaded", function(){
  // Setup the mesh handler
  Mesh.handle_buttons();
  Mesh.setup_websockets();
  
  // Setup the world
  World.setup();
  World.append_floor();
  World.handle_webworker();
  World.handle_events(Wheel.select);
  
  // Setup the wheel selection
  Wheel.setup(World);
  
  // Setup the camera
  Camera.setup();
  
  // Add the robot
  /*
  Robot.setup(function(){
    var m = Robot.meshes;
    for(var i=0,j=m.length;i<j;i++){World.add(m[i]);}
    Robot.update_skeleton();
  });
  */
  
  World.render();
  
});