// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  
  // Setup the world
  World.setup();
  Mesh.setup();
  Robot.setup();
  
  // Add items to be manipulated
  Manipulation.add_item(Waypoint);
  Manipulation.add_item(Hand);
  Manipulation.add_item(Hose);
  Manipulation.add_item(Wye);
  Manipulation.add_item(SmallValve);
  Manipulation.add_item(LargeValve);
  Manipulation.add_item(BarValve);
  Manipulation.add_item(Door);
  Manipulation.add_item(Tool);
  Manipulation.setup();
  
  // Setup the GUI
  clicker('modify_obj',Manipulation.modify);
  clicker('loop_obj',Manipulation.loop);
  //
  clicker('robot_show',Robot.show);
  clicker('robot_hide',Robot.hide);
  // Clearing the meshes
  clicker('wipe_mesh',World.clear_meshes);
  // During walking
  clicker('fast_mesh',function() {
    // Fast scan
    qwest.post(rest_root+'/m/vcm/chest_lidar/scanlines',{
      val: JSON.stringify([-1.0472, 1.0472, 2/DEG_TO_RAD])
    });
    // See far
    qwest.post( rest_root+'/m/vcm/chest_lidar/depths',{
      val:JSON.stringify([.2,5])
    });
    // Stream (PNG)
    qwest.post( rest_root+'/m/vcm/chest_lidar/net',{
      val:JSON.stringify([4,3,90,1])
    });
  });
  // During manipulation
  clicker('slow_mesh',function() {
    // Slow scan
    qwest.post(rest_root+'/m/vcm/chest_lidar/scanlines',{
      val: JSON.stringify([-1.0472, 1.0472, 5/DEG_TO_RAD])
    });
    // See close
    qwest.post( rest_root+'/m/vcm/chest_lidar/depths',{
      val:JSON.stringify([.1,1.5])
    });
    // Once (PNG)
    qwest.post( rest_root+'/m/vcm/chest_lidar/net',{
      val:JSON.stringify([3,3,90,1])
    });
  });
  
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
  
  // Vantage points (Position then target)
  clicker('vantage_top',function() {
    var cur = Robot.get_root();
    var position = cur.p.toArray();
    position[1] = 2000;
    var target = cur.p.toArray();
    target[2] += 50;
    World.set_view(position,target);
  });
  clicker('vantage_chest',function() {
    var cur = Robot.get_root();
    var position = cur.p.toArray();
    var target = cur.p.toArray();
    target[2] += 1000;
    World.set_view(position,target);
  });
  clicker('vantage_robot',function(){
    World.set_view('robot');
  });
  clicker('vantage_item',function() {
    var view = World.get_view();
    var item = Manipulation.get_item();
    var target = item.get_mod_mesh().position.toArray();
    World.set_view(view.position,target);
  });
  
  // State machines
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
  
  // begin animation
  (function animloop(){
    World.render();
    requestAnimationFrame(animloop);
  })();

});