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
    cur_item.start_modify();
    // reset
    this.removeEventListener('click', yes_mod, false);
    this.addEventListener('click', no_mod, false);
  };
  var no_mod = function(){
    cur_item.stop_modify();
    // reset
    this.removeEventListener('click', no_mod, false);
    this.addEventListener('click', yes_mod, false);
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
    // Re-render the world
    World.render();
  }
  
  Manipulation.setup = function(){
    // initialize the element
    cur_item_id = items.length - 1;
    cur_item    = items[cur_item_id];
    // Handle intersections with meshes in the world
    World.handle_intersection(cur_item.select);
    // Handle the button clicks
    clicker('modify_clicks_btn',yes_mod);
    clicker('clear_clicks_btn',clear_manip);
    clicker('obj_clicks_btn',cycle_item);
  }

  // export
	ctx.Manipulation = Manipulation;

})(this);