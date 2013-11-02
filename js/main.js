// Useful (globally accessible) functions
this.host = this.document.location.host.replace(/:.*/, '');
if( host.length==0 ){ host = "localhost"; }
// Compatibility layer for URL
this.URL = this.URL || this.webkitURL;
// assume port 8080 for testing...
this.rest_root = 'http://'+host+':8080';
// http://macwright.org/presentations/dcjq/
this.$ = function(x){return document.querySelectorAll(x);};
this.clicker = function(id,fun){
  document.getElementById(id).addEventListener('click', fun, false);
}
this.unclicker = function(id,fun){
  document.getElementById(id).removeEventListener('click', fun, false);
}

// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  // Setup the mesh handler
  Mesh.handle_buttons();
  Mesh.setup_websockets();
  
  // Setup the world
  World.setup();
  World.append_floor();
  
  // Setup the camera
  Camera.setup();
  
  // Setup the FSM buttons
  FSM.setup();
  
  // Add the robot
  Robot.setup(function(){
    var m = Robot.meshes;
    for(var i=0,j=m.length;i<j;i++){World.add(m[i]);}
    // Robot.update_skeleton();
  });
  
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
  clicker('modify_clicks_btn',yes_mod);
  clicker('clear_clicks_btn',Wheel.clear);
  //////////////////////////

  // Finally, render the world!
  World.render();

});