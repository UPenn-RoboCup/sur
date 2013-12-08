// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  // Setup the mesh handler
  Mesh.handle_buttons();
  Mesh.setup_websockets();
  
  // Setup the world
  World.setup();
  
  World.append_floor();
  
  // Setup the camera(s)
  Camera.setup();
  
  // Add items to be manipulated
  Manipulation.add_item(Waypoint);
  Manipulation.add_item(Hose);
  Manipulation.add_item(Wye);
  Manipulation.add_item(Hand);
  Manipulation.add_item(SmallValve);
  Manipulation.add_item(LargeValve);
  Manipulation.add_item(BarValve);
  Manipulation.add_item(Door);
  Manipulation.add_item(Tool);
  //Manipulation.add_item(Wheel);
  Manipulation.setup();
  
  // Add the robot
  Robot.setup(function(){
    Robot.show();
  });

  // Finally, render the world!
  World.render();
  
  /*
  // stats
  var stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  $('body')[0].appendChild( stats.domElement );
  */
  
  // begin animation
  (function animloop(){
    World.render();
    //stats.update();
    requestAnimationFrame(animloop);
  })();

});