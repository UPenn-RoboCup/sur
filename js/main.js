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
  if(typeof id==='string'){
    Hammer(document.getElementById(id)).on('tap',fun);
  } else {
    Hammer(id).on('tap',fun);
  }
}
this.unclicker = function(id,fun){
  if(typeof id==='string'){
    Hammer(document.getElementById(id)).off('tap',fun);
  } else {
    Hammer(id).off('tap',fun);
  }
}
this.DEG_TO_RAD = Math.PI/180;
this.RAD_TO_DEG = 180/Math.PI;

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
  
  // Add items to be manipulated
  Manipulation.add_item(Wheel);
  Manipulation.add_item(Tool);
  Waypoint.setup();
  Manipulation.add_item(Waypoint);
  Manipulation.setup();
  
  Manipulation.add_item(Door);
  
  // Add the robot
  Robot.setup(function(){
    var m = Robot.meshes;
    for(var i=0,j=m.length;i<j;i++){World.add(m[i]);}
    // x,y,a pose
    Robot.set_pose([0,0,0]);
  });

  // Finally, render the world!
  World.render();

});