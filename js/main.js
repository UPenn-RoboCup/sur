document.addEventListener( "DOMContentLoaded", function(){
  // Setup the mesh handler
  Mesh.handle_buttons();
  Mesh.setup_websockets();
  
  // Setup the world
  World.setup();
  World.append_floor();
  World.handle_webworker();
  World.handle_events(Wheel.select);
  
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
  
  // button listeners for 3d stuff
  //document.getElementById('clear_clicks_btn').addEventListener('click', Wheel.clear, false);

  var yes_mod = function(){
    console.log('MODIFYING!');
    Wheel.start_modify();
    // reset
    this.removeEventListener('click', yes_mod, false);
    this.addEventListener('click', no_mod, false);
  };
  var no_mod = function(){
    console.log('NO MODIFYING!');
    Wheel.stop_modify();
    // reset
    this.removeEventListener('click', no_mod, false);
    this.addEventListener('click', yes_mod, false);
  };
  // Initial setting
  document.getElementById('modify_clicks_btn').addEventListener('click', yes_mod, false);

});