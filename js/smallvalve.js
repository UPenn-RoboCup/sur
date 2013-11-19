(function(ctx){
  
  // Function to hold methods
  function SmallValve(){}
  
  //////////////
  // RPC URLs //
  //////////////
  var rpc_url = rest_root+'/m/hcm/smallvalve/model'
  
  /////////////////////
  // Mesh definition //
  /////////////////////
  // make the wheel
  var radius0  = 300;
  var tube_dia = 20;
  var item_geo = new THREE.TorusGeometry(radius0, tube_dia, 8, 20 );
  var item_mat = new THREE.MeshLambertMaterial({color: 0x5C5858});
  // Vertical spoke
  var vert_mesh = new THREE.Mesh(new THREE.CylinderGeometry(30,30,2*radius0,12,1));
  // Horizontal Spoke
  var horiz_mesh = new THREE.Mesh(new THREE.CylinderGeometry(30,30,2*radius0,12,1));
  horiz_mesh.rotation.set(0, 0, Math.PI/2);
  // Full mesh
  THREE.GeometryUtils.merge( item_geo, vert_mesh );
  THREE.GeometryUtils.merge( item_geo, horiz_mesh );
  var item_mesh = new THREE.Mesh( item_geo, item_mat );
  // Roll indicators should be a submesh
  var start_mat  = new THREE.MeshLambertMaterial({color: 0x00FF00});
  var start_path = new THREE.Path();
  start_path.fromPoints([
    new THREE.Vector2(0,0), // tip of the arrow
    new THREE.Vector2(-tube_dia,radius0-tube_dia),
    new THREE.Vector2(0,radius0),
    new THREE.Vector2(tube_dia,radius0-tube_dia),
  ]);
  var start_shape = start_path.toShapes();
  var start_geo  = new THREE.ExtrudeGeometry(
    start_shape, {}
  );
  var start_mesh  = new THREE.Mesh( start_geo, start_mat );
  //
  var stop_mat  = new THREE.MeshLambertMaterial({color: 0xFF0000});
  var stop_path = new THREE.Path();
  stop_path.fromPoints([
    new THREE.Vector2(0,0), // tip of the arrow
    new THREE.Vector2(-tube_dia,radius0-tube_dia),
    new THREE.Vector2(0,radius0),
    new THREE.Vector2(tube_dia,radius0-tube_dia),
  ]);
  var stop_shape = stop_path.toShapes();
  var stop_geo  = new THREE.ExtrudeGeometry(
    stop_shape, {}
  );
  var stop_mesh  = new THREE.Mesh( stop_geo, stop_mat );
  stop_mesh.rotation.set(0, 0, Math.PI/2);
  // append to the valve
  item_mesh.add(start_mesh);
  item_mesh.add(stop_mesh);
  
  //////////////////////
  // Model converters //
  //////////////////////
  var three_to_model = function(){
    return [];
  }
  var model_to_three = function(model){
    // {pos(3) roll_start roll_end}
    var p = new THREE.Vector3();
    p.fromArray(model);
    var roll_start = model[3];
    var roll_end = model[4];
  }
  
  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  SmallValve.select = function(p,r){
    
    // Set the position from the double click
    item_mesh.position.copy(p);

    // Re-render
    World.render();

  }
  // modification loop
  SmallValve.loop = function(){
    
  }
  // send data to the robot
  SmallValve.send = function(){
    
  }
  // clear the item
  SmallValve.clear = function(){
    
  }
  // enter
  SmallValve.init = function(){
    World.add(item_mesh);
  }
  // exit
  SmallValve.deinit = function(){
    World.remove(item_mesh);
  }
  SmallValve.get_mesh = function(){
    return item_mesh;
  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  SmallValve.item_name = 'Mini Valve';
  SmallValve.grab_evt = 'smallvalvegrab';
  // export
	ctx.SmallValve = SmallValve;

})(this);