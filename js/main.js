document.addEventListener( "DOMContentLoaded", function(){
  // Setup the mesh handler
  Mesh.handle_buttons();
  Mesh.setup_websockets();
  
  // Setup the world
  World.setup();
  World.append_floor();
  World.handle_webworker();
  
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
  
  //////////////////////////
  // Modifying the 3D scene
  // (common API, so we can switch from wheel to drill, etc.)
  World.handle_events(Wheel.select);
  var yes_mod = function(){
    Wheel.start_modify();
    // reset
    this.removeEventListener('click', yes_mod, false);
    this.addEventListener('click', no_mod, false);
  };
  var no_mod = function(){
    Wheel.stop_modify();
    // reset
    this.removeEventListener('click', no_mod, false);
    this.addEventListener('click', yes_mod, false);
  };
  // Initial setting
  document.getElementById('modify_clicks_btn').addEventListener('click', yes_mod, false);
  // Clearing the object
  document.getElementById('clear_clicks_btn').addEventListener('click', Wheel.clear, false);
  //////////////////////////

  // Finally, render the world!
  World.render();

});