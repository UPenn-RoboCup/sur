/*****
 * Camera display in the DOM
 */
(function(ctx){
  
  // Function to hold methods
  function Manipulation(){}
  
  // Make the modifying visual
  var tcontrol;
  
  // Manipulatable items
  var items = [];
  Manipulation.add_item = function(item){
    items.push(item);
  }
  Manipulation.is_mod = false;
  var cur_item_id = -1;
  var cur_item = null;
  var grab_btn, cycle_btn;
  
  // Functions to start/stop modifying
  var yes_mod = function(){
    if(Manipulation.is_mod===true){return;}
    Manipulation.is_mod = true;
    
    // stop the normal controls
    World.disable_orbit();
    
    // attach
    var cur_mesh = cur_item.get_mesh();
    tcontrol.attach( cur_mesh );
    
    World.add( tcontrol );
    tcontrol.update();
    
    // Keyboard shortcuts
    keypress.register_many(tcontrol_hotkeys);
    
    // Re-render
    World.render();
        
    // reset
    unclicker(this,yes_mod);
    clicker(this,no_mod);
  };
  var no_mod = function(){
    if(Manipulation.is_mod===false){return;}
    Manipulation.is_mod = false;

    // Remove the tcontrol
    World.remove( tcontrol );
    
    // detach
    var cur_mesh = cur_item.get_mesh();
    tcontrol.detach( cur_mesh );
    
    World.enable_orbit();
    World.render();
    
    // Keyboard shortcuts
    keypress.unregister_many(tcontrol_hotkeys);
    
    // send the model to the robot
    cur_item.send();
    
    // reset
    unclicker(this,no_mod);
    clicker(this,yes_mod);
  };
  // Function to clear manipulation points/objects
  var clear_manip = function(){
    cur_item.clear(tcontrol);
  }
  // Function to cycle manipulation item
  var cycle_item = function(){
    // Stop modifying
    //no_mod();
    // Remove the event listener
    tcontrol.removeEventListener( 'modify', cur_item.mod_callback );
    // De-init
    cur_item.deinit();
    
    // find the next item
    cur_item_id++;
    if(cur_item_id>=items.length){cur_item_id=0;}
    cur_item = items[cur_item_id];
    // Update the display of the button
    cycle_btn.textContent = cur_item.item_name;
    
    // Init the item
    cur_item.init(tcontrol);
    
    // Add the event listener
    tcontrol.addEventListener( 'modify', cur_item.mod_callback );
    
    // Handle intersections with meshes in the world
    World.handle_intersection(cur_item.select);
    // Re-render the world
    World.render();
  }
  
  var loop_item = function(){
    cur_item.loop(tcontrol);
  }
  
  var grab_item = function(){
    var grab_evt = cur_item.grab_evt;
    if(grab_evt===undefined){return;}
    qwest.post(fsm_url,{fsm: 'ArmFSM', evt: grab_evt});
  }
  
  Manipulation.get_vantage = function(){
    var cp = cur_item.get_position;
    if(cp!==undefined){
      var p = cp();
      var v = {
        position: p.position.toArray(),
        target: p.position.toArray(),
      };
      v.position[2] = v.position[2] - 200;
    }
    else
    {
      return {position: [0,1000,250], target: [0,1000,500]};
    }
  }
  
  Manipulation.setup = function(){
    // Acquire buttons
    cycle_btn = $('#cycle_obj')[0];
    grab_btn = $('#arm_grab')[0];
    
    // Handle the button clicks
    clicker('modify_obj',yes_mod);
    clicker('clear_obj', clear_manip);
    clicker('cycle_obj', cycle_item);
    clicker('loop_obj',loop_item);
    // special grab click
    clicker(grab_btn, grab_item);
    
    // initialize the element
    //cur_item_id = items.length - 1;
    cur_item_id = 0;
    cur_item    = items[cur_item_id];
    cycle_btn.textContent = cur_item.item_name;
    
    // init
    cur_item.init();
    
    // Handle intersections with meshes in the world
    World.handle_intersection(cur_item.select);
    
    // Spacemouse
    var port = 9012;
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.binaryType = "arraybuffer";
    ws.onmessage = function(e){
      var sp_mouse = JSON.parse(e.data);
      //console.log('spacemouse'.e,sp_mouse);
    };
    
    // Make a tcontrol
    tcontrol = World.generate_tcontrol();
    tcontrol.attach( cur_item.get_mesh() );
    tcontrol.addEventListener( 'change', World.render );
    tcontrol.addEventListener( 'modify', cur_item.mod_callback );
    
  } // setup

  //////
  // Keypressing hotkeys
  var tcontrol_hotkeys = [
    {
      // swap global/local for visual cue
      "keys"          : "`",
      "is_exclusive"  : true,
      "on_keyup"      : function(event) {
          event.preventDefault();
          tcontrol.setSpace( tcontrol.space == "local" ? "world" : "local" );
      },
      "this"          : ctx
    },
    {
      // translation
      "keys"          : "t",
      "is_exclusive"  : true,
      "on_keyup"      : function(event) {
          event.preventDefault();
          tcontrol.setMode( "translate" );
      },
      "this"          : ctx
    },
    {
      // rotation
      "keys"          : "r",
      "is_exclusive"  : true,
      "on_keyup"      : function(event) {
          event.preventDefault();
          tcontrol.setMode( "rotate" );
      },
      "this"          : ctx
    },
    {
      // scale
      "keys"          : "y",
      "is_exclusive"  : true,
      "on_keyup"      : function(event) {
          event.preventDefault();
          tcontrol.setMode( "scale" );
      },
      "this"          : ctx
    },
  ];

  // export
	ctx.Manipulation = Manipulation;

})(this);