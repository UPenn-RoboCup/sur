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
    var item_id = items.length;
    // Store in our array
    items.push(item);
    // Place as a select option
    var menu = $('#menu_obj')[0];
    // If no menu, then exit
    if(menu===undefined){return;}
    var option = new Option(item.item_name);
    option.value = item_id;
    menu.appendChild(option);
  }
  Manipulation.is_mod = false;
  var cur_item_id = -1, cur_item = null;
  
  // Functions to start/stop modifying
  var yes_mod = function(){
    if(Manipulation.is_mod==true){return;}
    Manipulation.is_mod = true;
    // Initial callback
    cur_item.mod_callback();
    // stop the normal controls
    World.disable_orbit();
    // attach the tcontrol
    var cur_mesh = cur_item.get_mod_mesh();
    tcontrol.attach( cur_mesh );
    World.add( tcontrol );
    tcontrol.update();
    // Keyboard shortcuts for tcontrol
    keypress.register_many(tcontrol_hotkeys);
    // Re-render
    
    // reset the buttons
    if(this!==ctx){
      unclicker(this,yes_mod);
      clicker(this,no_mod);
    }
  };
  var no_mod = function(){
    if(Manipulation.is_mod==false){return;}
    Manipulation.is_mod = false;
    // Final callback
    cur_item.mod_callback();
    // Remove the tcontrol
    World.remove( tcontrol );
    // detach the tcontrol
    var cur_mesh = cur_item.get_mod_mesh();
    tcontrol.detach( cur_mesh );
    // Go back to the normal view
    World.enable_orbit();
    
    // Keyboard shortcuts
    keypress.unregister_many(tcontrol_hotkeys);
    // send the model to the robot
    cur_item.send();
    // Ensure that we do not set a clicker on the whole page
    if(this!==ctx){
      unclicker(this,no_mod);
      clicker(this,yes_mod);
    }
  };
  // Function to cycle manipulation item to the item_id
  var cycle_item = function(item_id){
    // Stop modifying
    no_mod();
    // Remove the event listener
    tcontrol.removeEventListener( 'modify', cur_item.mod_callback );
    // De-init
    cur_item.deinit(tcontrol);
    // Remove the special buttons
    var btn_holder = $('#arm_events')[0];
    while (btn_holder.firstChild) {
      btn_holder.removeChild(btn_holder.firstChild);
    }
    
    // set the next item
    cur_item_id = item_id;
    if(cur_item_id>=items.length){cur_item_id=0;}
    cur_item = items[cur_item_id];
    
    // Init the item
    cur_item.init(tcontrol);
    // Add the event listener
    tcontrol.addEventListener( 'modify', cur_item.mod_callback );
    // Handle intersections with meshes in the world
    World.handle_intersection(cur_item.select);
    
    // Set the buttons for this object
    cur_item.add_buttons(btn_holder);
    
  }
  
  var loop_item = function(){
    cur_item.loop(tcontrol);
  }

  // Vantage point for looking at objects
  Manipulation.get_vantage = function(){
    var cp = cur_item.get_position;
    var p = cp();
    var v = {
      position: p.position.toArray(),
      target: p.position.toArray(),
    };
    v.position[2] = v.position[2] - 200;
    return v;
  }
  
  Manipulation.setup = function(){
    // Handle the button clicks
    clicker('modify_obj',yes_mod);
    clicker('loop_obj',loop_item);
    // initialize the element
    cur_item_id = 0;
    cur_item    = items[cur_item_id];
    cur_item.init();
    cur_item.add_buttons();
    // Handle intersections with meshes in the world
    World.handle_intersection(cur_item.select);
    // Make a tcontrol
    tcontrol = World.generate_tcontrol();
    tcontrol.attach( cur_item.get_mod_mesh() );
    //tcontrol.addEventListener( 'change', World.render );
    tcontrol.addEventListener( 'modify', cur_item.mod_callback );
    // Setup hotkeys for items
    keypress.register_many(item_hotkeys);
    // Setup the menu
    var menu = $('#menu_obj')[0];
    if(menu!==undefined){
      menu.addEventListener('change', function(){
        cycle_item(this.value);
        this.blur();
      }, false);
    }
    
  } // setup

  //////
  // Keypressing hotkeys
  var tcontrol_hotkeys = [
    {
      // Escape modifications
      "keys"          : "escape",
      "is_exclusive"  : true,
      "on_keyup"      : function(event) {
          event.preventDefault();
          no_mod();
      },
      "this"          : ctx
    },
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
    /*
    {
      // scale (should never use)
      "keys"          : "y",
      "is_exclusive"  : true,
      "on_keyup"      : function(event) {
          event.preventDefault();
          tcontrol.setMode( "scale" );
      },
      "this"          : ctx
    },
    */
  ];
  
  // Keypressing hotkeys
  var dp = 10; // 1cm at a time
  var item_hotkeys = [
  {
    "keys"          : "i",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
      event.preventDefault();
      var mod_mesh = cur_item.get_mod_mesh();
      // Relative direction wrt robot
      var pa = Robot.pa;
      var ca = Math.cos(pa), sa = Math.sin(pa);
      var dx = dp*ca, dy = dp*sa;
      mod_mesh.position.x += dy;
      mod_mesh.position.z += dx;
      //
      cur_item.mod_callback();
      cur_item.send();
    },
    "this"          : ctx
  },
  {
    "keys"          : ",",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
      event.preventDefault();
      var mod_mesh = cur_item.get_mod_mesh();
      // Relative direction wrt robot
      var pa = Robot.pa;
      var ca = Math.cos(pa), sa = Math.sin(pa);
      var dx = dp*ca, dy = dp*sa;
      mod_mesh.position.x -= dy;
      mod_mesh.position.z -= dx;
      cur_item.mod_callback();
      cur_item.send();
    },
    "this"          : ctx
  },
  {
    "keys"          : "j",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
      event.preventDefault();
      var mod_mesh = cur_item.get_mod_mesh();
      // Relative direction wrt robot
      var pa = Robot.pa;
      var ca = Math.cos(pa), sa = Math.sin(pa);
      var dx = dp*sa, dy = -dp*ca;
      mod_mesh.position.x -= dy;
      mod_mesh.position.z -= dx;
      //
      cur_item.mod_callback();
      cur_item.send();
    },
    "this"          : ctx
  },
  {
    "keys"          : "l",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        var mod_mesh = cur_item.get_mod_mesh();
        // Relative direction wrt robot
        var pa = Robot.pa;
        var ca = Math.cos(pa), sa = Math.sin(pa);
        var dx = dp*sa, dy = -dp*ca;
        mod_mesh.position.x += dy;
        mod_mesh.position.z += dx;
        //
        cur_item.mod_callback();
        cur_item.send();
    },
    "this"          : ctx
  },
  {
    "keys"          : "u",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        var mod_mesh = cur_item.get_mod_mesh();
        mod_mesh.position.y += 10;
        cur_item.mod_callback();
        // Send on each keypress modification
        cur_item.send();
    },
    "this"          : ctx
  },
  {
    "keys"          : "m",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        var mod_mesh = cur_item.get_mod_mesh();
        mod_mesh.position.y -= 10;
        cur_item.mod_callback();
        // Send on each keypress modification
        cur_item.send();
    },
    "this"          : ctx
  },
  ];

  // export
	ctx.Manipulation = Manipulation;

})(this);