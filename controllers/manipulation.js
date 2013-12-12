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
    //cur_item.send();
    
  };
  // Function to cycle manipulation item to the item_id
  Manipulation.cycle_item = function(item_id){
    // Remove the event listener
    tcontrol.removeEventListener( 'modify', cur_item.mod_callback );
    // De-init
    cur_item.deinit(tcontrol);
    
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
    
  }

  ////////////////
  // Global API //
  ////////////////
  Manipulation.is_mod = false;
  
  // Loop the item
  Manipulation.loop = function(){
    cur_item.loop(tcontrol);
  }
  
  Manipulation.modify = function(set){
    if(set=='yes'){
      yes_mod();
    } else if(set=='no'){
      no_mod();
    } else {
      // Toggle
      if(Manipulation.is_mod==false){yes_mod();}else{no_mod();}
    }
  }
  
  // Add an item
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
  
  // Vantage point for looking at objects
  Manipulation.get_item = function(){
    return cur_item;
  }
  
  Manipulation.setup = function(){
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
    tcontrol.addEventListener( 'modify', cur_item.mod_callback );
    // Setup hotkeys for items
    keypress.register_many(item_hotkeys);
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
      //cur_item.send();
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
      //cur_item.send();
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
      //cur_item.send();
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
        //cur_item.send();
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
        //cur_item.send();
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
        //cur_item.send();
    },
    "this"          : ctx
  },
  {
    "keys"          : "h",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        var mod_mesh = cur_item.get_mod_mesh();
        mod_mesh.rotation.y += .1;
        cur_item.mod_callback();
        // Send on each keypress modification
        //cur_item.send();
    },
    "this"          : ctx
  },
  {
    "keys"          : ";",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        var mod_mesh = cur_item.get_mod_mesh();
        mod_mesh.rotation.y -= .1;
        cur_item.mod_callback();
        // Send on each keypress modification
        //cur_item.send();
    },
    "this"          : ctx
  },
  // Special keys
  {
    "keys"          : "[",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        cur_item.special(-1);
    },
    "this"          : ctx
  },
  {
    "keys"          : "]",
    "is_exclusive"  : true,
    "on_keyup"      : function(event) {
        event.preventDefault();
        cur_item.special(1);
    },
    "this"          : ctx
  },
  ];

  // export
	ctx.Manipulation = Manipulation;

})(this);