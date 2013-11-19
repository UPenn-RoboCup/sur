/*****
 * 3D wheel model
 */
(function(ctx){
  
  // Function to hold methods
  function SmallValve(){}
  var rpc_url = rest_root+'/m/hcm/wheel/model'
  
  // make the wheel
  var radius0  = 300;
  var item_geo = new THREE.TorusGeometry(radius0, 20, 8, 20);
  var item_mat = new THREE.MeshLambertMaterial({color: 0x5C5858});

  // Vertical spoke
  var vert_mesh = new THREE.Mesh(new THREE.CylinderGeometry(30,30,2*radius0,12,1));

  // Horizontal Spoke
  var euler_angle = new THREE.Euler( 0, 0, Math.PI/2 );
  var horiz_mesh = new THREE.Mesh(new THREE.CylinderGeometry(30,30,2*radius0,12,1));
  horiz_mesh.rotation.copy(euler_angle);

  // Full mesh
  THREE.GeometryUtils.merge( item_geo, vert_mesh );
  THREE.GeometryUtils.merge( item_geo, horiz_mesh );
  var item_mesh = new THREE.Mesh( item_geo, item_mat );
  
  ///////////////////////
  // object manipulation API
  // set up the intersection handler
  // point in THREEjs: p
  // point in robot: r
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
  ///////////////////////

  SmallValve.item_name = 'Mini Valve';
  SmallValve.grab_evt = 'smallvalvegrab';
  // export
	ctx.SmallValve = SmallValve;

})(this);