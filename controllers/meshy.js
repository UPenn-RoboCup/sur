// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  
  // Setup the world
  World.setup();
  Mesh.setup();
  Robot.setup();
  
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
    // Relative direction wrt robot
    var dp = 500;
    var pa = Robot.pa;
    var ca = Math.cos(pa), sa = Math.sin(pa);
    var dx = dp*ca, dy = dp*sa;
    var target = cur.p.toArray();
    target[0] += dy;
    target[2] += dx;
    //
    World.set_view(position,target);
  });
  clicker('vantage_chest',function() {
    var cur = Robot.get_root();
    var position = cur.p.toArray();
    var target = cur.p.toArray();
    var dp = 1000;
    var pa = Robot.pa;
    var ca = Math.cos(pa), sa = Math.sin(pa);
    var dx = dp*ca, dy = dp*sa;
    var target = cur.p.toArray();
    target[0] += dy;
    target[2] += dx;
    World.set_view(position,target);
  });
  clicker('vantage_side',function() {
    var dp = 500;
    var pa = Robot.pa;
    var ca = Math.cos(pa), sa = Math.sin(pa);
    var dx = dp*sa, dy = -dp*ca;
    var cur = Robot.get_root();
    //
    var position = cur.p.toArray();
    var target = position.slice();
    position[0] += dy;
    position[2] += dx;
    var dx = dp*ca, dy = dp*sa;
    position[0] += dy;
    position[2] += dx;
    target[0] += dy;
    target[2] += dx;
    World.set_view(position,target);
  });
  clicker('vantage_item',function() {
    var view = World.get_view();
    var item = Manipulation.get_item();
    var target = item.get_mod_mesh().position.toArray();
    World.set_view(view.position,target);
  });
  clicker('vantage_robot',function(){
    World.set_view('robot');
  });
  
  // State machines
  clicker('body_init',function() {
    qwest.post(fsm_url,{fsm: 'BodyFSM' , evt: 'init'});
  });
  clicker('body_follow',function(){
    Waypoint.send(function(){
      qwest.post(fsm_url,{fsm: 'BodyFSM' , evt: 'follow'});
    });
  });
  
  // Each arm event
  clicker('arm_doorgrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'doorgrab'});
  });
  clicker('arm_pushdoorgrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'pushdoordoorgrab'});
  });
  clicker('arm_loaddoorgrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'loaddoordoorgrab'});
  });
  clicker('arm_toolgrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'toolgrab'});
  });
  clicker('arm_hosegrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'hosegrab'});
  });
  clicker('arm_smallvalvegrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'smallvalvegrab'});
  });
  clicker('arm_largevalvegrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'largevalvegrab'});
  });
  clicker('arm_barvalvegrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'barvalvegrab'});
  });
  
  // Setup manipulation
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
  var menu = $('#menu_obj')[0];
  if(menu!==undefined){
    menu.addEventListener('change', function(){
      Manipulation.cycle_item(this.value);
      this.blur();
    }, false);
  }
  // Fine tune modify non-keypress
  clicker('modify_obj',Manipulation.modify);
  clicker('loop_obj',Manipulation.loop);
  
  // begin animation
  (function animloop(){
    World.render();
    requestAnimationFrame(animloop);
  })();

});