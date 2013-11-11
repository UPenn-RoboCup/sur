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
  var cur_item_id = -1;
  var cur_item = null;
  
  // Functions to start/stop modifying
  var yes_mod = function(){
    console.log('yes mod!')
    cur_item.start_modify();
    // reset
    unclicker(this,yes_mod);
    clicker(this,no_mod);
  };
  var no_mod = function(){
    console.log('no mod!')
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
    cur_item = items[cur_item_id];
    // Update the display of the button
    $('#obj_clicks_btn')[0].textContent = cur_item.item_name;
    // Handle intersections with meshes in the world
    World.handle_intersection(cur_item.select);
    // Re-render the world
    World.render();
  }
  
  Manipulation.setup = function(){
    // initialize the element
    cur_item_id = items.length - 1;
    cur_item    = items[cur_item_id];
    $('#obj_clicks_btn')[0].textContent = cur_item.item_name;
    // Handle intersections with meshes in the world
    World.handle_intersection(cur_item.select);
    // Handle the button clicks
    clicker('modify_clicks_btn',yes_mod);
    clicker('clear_clicks_btn',clear_manip);
    clicker('obj_clicks_btn',cycle_item);
    // Spacemouse
    var port = 9012;
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.binaryType = "arraybuffer";
    ws.onmessage = function(e){
      var sp_mouse = JSON.parse(e.data);
      //console.log('spacemouse'.e,sp_mouse);
      // Move the current item mesh
      
    };
    // spacemouse end
  }

  // export
	ctx.Manipulation = Manipulation;

})(this);