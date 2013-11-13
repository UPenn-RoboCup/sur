/*****
 * Camera display in the DOM
 */
(function(ctx){
  
  // Function to hold methods
  function Manipulation(){}
  
  // Manipulatable items
  var items = [];
  Manipulation.add_item = function(item){
    items.push(item);
  }
  var is_mod = false;
  var cur_item_id = -1;
  var cur_item = null;
  var grab_btn, cycle_btn;
  
  // Functions to start/stop modifying
  var yes_mod = function(){
    if(is_mod){return;}
    is_mod = true;
    cur_item.start_modify();
    // reset
    unclicker(this,yes_mod);
    clicker(this,no_mod);
  };
  var no_mod = function(){
    if(!is_mod){return;}
    is_mod = false;
    cur_item.stop_modify();
    // reset
    unclicker(this,no_mod);
    clicker(this,yes_mod);
  };
  // Function to clear manipulation points/objects
  var clear_manip = function(){
    cur_item.clear();
  }
  // Function to cycle manipulation item
  var cycle_item = function(){
    // Clear the current helpers
    clear_manip();
    // Stop modifying
    //no_mod();
    // find the next item
    cur_item_id++;
    if(cur_item_id>=items.length){cur_item_id=0;}
    if(cur_item.deinit!==undefined){cur_item.deinit();}
    cur_item = items[cur_item_id];
    if(cur_item.init!==undefined){cur_item.init();}
    // Update the display of the button
    cycle_btn.textContent = cur_item.item_name;
    
    // Handle intersections with meshes in the world
    World.handle_intersection(cur_item.select);
    // Re-render the world
    World.render();
  }
  
  var loop_item = function(){
    if(cur_item.loop!==undefined){cur_item.loop();}
  }
  
  var grab_item = function(){
    var grab_evt = cur_item.grab_evt;
    if(grab_evt===undefined){return;}
    qwest.post(fsm_url,{fsm: 'ArmFSM', evt: grab_evt});
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
    cur_item_id = items.length - 1;
    cur_item    = items[cur_item_id];
    cycle_btn.textContent = cur_item.item_name;
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
    
  } // setup

  // export
	ctx.Manipulation = Manipulation;

})(this);