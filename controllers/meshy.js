// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  
  // Setup the world
  World.setup();
  Mesh.setup();
  Robot.setup();
  
  // Speakers
  Speaker.setup();
  clicker('head_audio',function(){
    qwest.post(rest_root+'/m/hcm/audio/request',{val: JSON.stringify([1])});
  });
  
  // Setup the GUI
  clicker('modify_obj',Manipulation.modify);
  clicker('loop_obj',Manipulation.loop);
  clicker('robot_toggle',Robot.toggle);
  // Clearing the meshes
  clicker('wipe_mesh',World.clear_meshes);
  // During walking
  clicker('fast_mesh',function() {
    // See far
    qwest.post( rest_root+'/m/vcm/chest_lidar/depths',{
      val:JSON.stringify([.3,3])
    });
    // Single (JPEG)
    qwest.post( rest_root+'/m/vcm/chest_lidar/net',{
      val:JSON.stringify([3,1,60,1])
    });
  });
/*
  // During manipulation
  clicker('slow_mesh',function() {
    // See close
    qwest.post( rest_root+'/m/vcm/chest_lidar/depths',{
      val:JSON.stringify([.2,1])
    });
    // Once (PNG)
    qwest.post( rest_root+'/m/vcm/chest_lidar/net',{
      val:JSON.stringify([3,3,50,1])
    });
  });
*/
  // try
  clicker('quick_mesh',function() {
    // See close
    qwest.post( rest_root+'/m/vcm/chest_lidar/depths',{
      val:JSON.stringify([.2,1])
    });
    // Once (JPEG)
    qwest.post( rest_root+'/m/vcm/chest_lidar/net',{
      val:JSON.stringify([3,1,88,1])
    });
  });
  
  // Proceed buttons
  clicker('proceed_reverse',function(){
    qwest.post( rpc_url_proceed, {val:JSON.stringify([-1])} )
  });
  clicker('proceed_proceed',function(){
    qwest.post( rpc_url_proceed, {val:JSON.stringify([1])} )
  });
  /*
  clicker('proceed_notify',function(){
    qwest.post( rpc_url_proceed, {val:JSON.stringify([2])} )
  });
  clicker('proceed_override',function(){
    qwest.post( rpc_url_proceed, {val:JSON.stringify([3])} )
  });
  */
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
  /*
  clicker('vantage_robot',function(){
    World.set_view('robot');
  });
  */
  
  // State machines
  clicker('body_init',function() {
    qwest.post(fsm_url,{fsm: 'BodyFSM' , evt: 'init'});
  });
  clicker('body_follow',function(){
    qwest.post(fsm_url,{fsm: 'BodyFSM' , evt: 'follow'});
  });
  
  // Each arm event
  clicker('arm_doorgrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'doorgrab'});
  });
  clicker('arm_pushdoorgrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'pushdoorgrab'});
  });
  clicker('arm_loaddoorgrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'loaddoorgrab'});
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
  clicker('arm_barvalvegrab',function(){
    qwest.post(fsm_url,{fsm: 'ArmFSM' , evt: 'barvalvegrab'});
  });
  
  // Setup manipulation
  Manipulation.add_item(Waypoint);
  Manipulation.add_item(Hand);
  Hand.init();
  Manipulation.add_item(Hose);
  Manipulation.add_item(Wye);
  /*
  Manipulation.add_item(SmallValve);
  */
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

var select_hotkeys = [
    {
      // swap global/local for visual cue
      "keys"          : "1",
      "is_exclusive"  : true,
      "on_keyup"      : function(event) {
          event.preventDefault();
	  Manipulation.cycle_item(0)
menu.value=0;
      },
      "this"          : window
    },
    {
      // swap global/local for visual cue
      "keys"          : "2",
      "is_exclusive"  : true,
      "on_keyup"      : function(event) {
          event.preventDefault();
          Manipulation.cycle_item(1)
menu.value=1
      },
      "this"          : window
    },

]

keypress.register_many(select_hotkeys)


  // Fine tune modify non-keypress
  clicker('modify_obj',Manipulation.modify);
  clicker('loop_obj',Manipulation.loop);
  clicker('send_obj',function(){
    Manipulation.get_item().send();
  });
  
  // Data sharing
  var peer = new Peer('meshy', {host: 'localhost', port: 9000});
  peer.on('connection', function(conn){
    console.log('Peer | New connection',conn.peer);
    // Receive messages
    conn.on('data', function(data) {
      if(data.evt=='camera_click'){
        if(World.is_robot_camera){
          Transform.head_intersect(data);
        } else {
          Transform.head_look(data);
        }
      }
    });
  });
  
  // begin animation
  (function animloop(){
    World.render();
    requestAnimationFrame(animloop);
  })();

});
