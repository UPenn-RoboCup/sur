/*****
 * 3D tool model
 */
(function(ctx){
  
  // Function to hold methods
  function Tool(){}
  // Sending to the robot
  var rpc_url = rest_root+'/m/hcm/tool/model'
  
  // make the master item (i.e. grip handle)
  var item_mat   = new THREE.MeshLambertMaterial({color: 0xFFD801});
  var item_geo   = new THREE.CylinderGeometry(25,25,140,12,1,false);
  // Drill direction
  var item2_mesh = new THREE.Mesh(new THREE.CylinderGeometry(30,30,240,12,1));
  // This also used as tmp variable
  var item_angle = new THREE.Euler( Math.PI/2, 0, 0 );
  item2_mesh.quaternion.setFromEuler( item_angle );
  item2_mesh.position.set(0,85,30);
  THREE.GeometryUtils.merge( item_geo, item2_mesh );
  // Drill base
  var item3_mesh = new THREE.Mesh(new THREE.CubeGeometry(80,70,120));
  item3_mesh.position.set(0,-90,0);
  THREE.GeometryUtils.merge( item_geo, item3_mesh );

  // Instantiate the master
  var item_mesh  = new THREE.Mesh( item_geo, item_mat );
  
  var three_to_robot = function(){
    // Acquire the model
    item_angle.setFromQuaternion(item_mesh.quaternion);
    // Points in THREEjs to torso frame
    var model = Transform.three_to_torso(item_mesh.position,Robot);
    model.push(item_angle.y);
    return model;
  }
  var robot_to_three = function(model){
  }
  
  ///////////////////////
  // object manipulation API
  // set up the intersection handler
  // point in THREEjs: p
  // point in robot: r
  Tool.select = function(p,r){
    // Set the position
    item_mesh.position.copy(p);
    // Re-render
    World.render();
  }
  Tool.send = function(){
    var model = three_to_robot();
    qwest.post( rpc_url, {val:JSON.stringify(model)} );
  }
  Tool.clear = function(){

  }
  Tool.init = function(){
    // Add to the world
    World.add(item_mesh);
  }
  Tool.deinit = function(){
    // Add to the world
    World.remove(item_mesh);
  }
  Tool.get_mesh = function(){
    return item_mesh;
  }
  Tool.loop = function(){
    
  }
  Tool.mod_callback = function(){
    
  }
  ///////////////////////

  Tool.item_name = 'Tool';
  Tool.grab_evt = 'toolgrab';
  // export
	ctx.Tool = Tool;

})(this);