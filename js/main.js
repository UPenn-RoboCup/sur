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
  Camera2.setup();
  
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
  
  // Attach click bindings to the FSM buttons
  var a = $('#fsm a');
  for(var i=0, j=a.length; i<j; i++){
    var btn = a[i];
    var id  = btn.id;
    // Grab is a special button
    if(id=='arm_grab'){continue;}
    var sep = id.indexOf('_');
    var evt = id.substring(sep+1);
    var sm = id.substring(0,sep);
    var fsm = sm.charAt(0).toUpperCase() + sm.slice(1) + 'FSM';
    // Add the listener
    if(fsm=='BodyFSM'&&evt=='follow'){
      clicker(btn,
      (function(){
        var wp_url = rest_root+'/m/hcm/motion/waypoints';
        var wp = Waypoint.get_robot();
        var b_evt = this.evt, b_fsm = this.fsm;
        // Send the waypoint
        qwest.post( wp_url, {val:JSON.stringify(wp)} )
        .complete(function(){
          // Then send the follow event!
          qwest.post(fsm_url,{fsm: b_fsm, evt: b_evt});
        });
      }).bind({evt:evt,fsm:fsm})
      );
    } else {
      clicker(btn,
      (function(){
        qwest.post(fsm_url,{fsm: this.fsm , evt: this.evt});
      }).bind({evt:evt,fsm:fsm})
    );
    }
  } // for each
  
  // Proceed buttons
  var rpc_url_proceed = rest_root+'/m/hcm/state/proceed'
  clicker('proceed_reverse',function(){
    qwest.post( rpc_url_proceed, {val:JSON.stringify(-1)} )
  });
  clicker('proceed_proceed',function(){
    qwest.post( rpc_url_proceed, {val:JSON.stringify(1)} )
  });
  clicker('proceed_notify',function(){
    qwest.post( rpc_url_proceed, {val:JSON.stringify(2)} )
  });
  
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