/*****
 * 3D wheel model
 */
(function(ctx){
  
  // Function to hold methods
  function Waypoint(){}

  //////////////
  // RPC URLs //
  //////////////
  var rpc_url = rest_root+'/m/hcm/motion/waypoints';
  var rpc_url_n = rest_root+'/m/hcm/motion/nwaypoints';
  var rpc_url_fr = rest_root+'/m/hcm/motion/waypoint_frame';
  
  /////////////////////
  // Mesh definition //
  /////////////////////
  var item_mat = new THREE.MeshLambertMaterial({color: 0xFFFF00});
  var item_geo = new THREE.LatheGeometry([
    new THREE.Vector3(   0, 0,    0),
    new THREE.Vector3(  50, 0,  -50),
    new THREE.Vector3(  25, 0,  -50),
    new THREE.Vector3(  25, 0, -125),
    new THREE.Vector3(   0, 0, -125),
  ], 12, -Math.PI, -Math.PI);
  var item_mesh  = new THREE.Mesh( item_geo, item_mat );
  
  var bbox_geo = new THREE.CubeGeometry(800,20,1000,10,1,10);
  var bbox_mat = new THREE.MeshLambertMaterial({color: 0x444400,wireframe: true});
  var bbox_mesh  = new THREE.Mesh( bbox_geo, bbox_mat );
  bbox_mesh.position.y = 10;
  bbox_mesh.position.z = 350;
  item_mesh.add(bbox_mesh)
  
  // make the indicators;
  var l_indicator = new THREE.Mesh(
    new THREE.OctahedronGeometry(25),
    new THREE.MeshLambertMaterial({color: 0x2017FD})
  );
  var r_indicator = new THREE.Mesh(
    new THREE.OctahedronGeometry(25),
    new THREE.MeshLambertMaterial({color: 0xFD2017})
  );
  var first_indicator = true;
  
  var item_mat2 = new THREE.MeshLambertMaterial({color: 0xAAAAAA,wireframe: true});
  var item_mesh2 = new THREE.Mesh( item_geo.clone(), item_mat2 );
  
  //////////////////////
  // Model converters //
  //////////////////////
  var three_to_model = function(){
    // Acquire the position of the tip:
    var p = (new THREE.Vector3()).copy(item_mesh.position);
    // Make the robot GLOBAL pose
    var px = p.z / 1000;
    var py = p.x / 1000;
    // Make the robot GLOBAL orientation
    var pa = Transform.mod_angle(item_mesh.rotation.y);
    // Pose_local to pose_global
    return [px,py,pa];
  }
  var model_to_three = function(model){
    // Assumption: Global coordinates
    item_mesh.position.x = 1000*model[1];
    item_mesh.position.z = 1000*model[0];
    item_mesh.rotation.y = model[2];
  }
  
  var model2_loop = function(){
    // Assumption: Global coordinates
    /*
    item_mesh2.position.x = 1000*Robot.py;
    item_mesh2.position.z = 1000*Robot.px;
    item_mesh2.rotation.y = Robot.pa;
    */
    item_mesh2.position.copy(item_mesh.position);
    item_mesh2.rotation.copy(item_mesh.rotation);
  }
  Waypoint.curdicate = model2_loop;
  
  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  Waypoint.select = function(p,r){
    // Send upon done second indicator
    if(first_indicator){
      // Put the mesh in the right position (no orientation change)
      l_indicator.position.copy(p);
    } else {
      // Put the mesh in the right position (no orientation change)
      r_indicator.position.copy(p);
      // Calculate the angle
      var dx = r_indicator.position.z - l_indicator.position.z;
      var dy = l_indicator.position.x - r_indicator.position.x;
      var a = Math.atan2(dx,dy);
      // Set the item rotation
      item_mesh.rotation.y = a;
      item_mesh.position.z = (r_indicator.position.z+l_indicator.position.z)/2;
      item_mesh.position.x = (r_indicator.position.x+l_indicator.position.x)/2;
    }
    // Swap indicators
    first_indicator = !first_indicator;
  }
  Waypoint.loop = function(){
    model_to_three([Robot.px,Robot.py,Robot.pa]);
    model2_loop();
  }
  // enter
  Waypoint.init = function(){
    first_indicator = true;
    World.add( item_mesh );
    World.add( item_mesh2 );
    World.add( l_indicator );
    World.add( r_indicator );
  }
  //exit
  Waypoint.deinit = function(){
    World.remove( l_indicator );
    World.remove( r_indicator );
  }
  // Constrain the angles to 2D (i.e. one angle)
  Waypoint.mod_callback = function(){
    // Retain the same angles
    item_mesh.rotation.x = 0;
    item_mesh.rotation.z = 0;
    // Retain the same height
    item_mesh.position.y = 0;
    // Mod-angle it...
    item_mesh.rotation.y = Transform.mod_angle(item_mesh.rotation.y);
  }
  // send to robot
  Waypoint.send = function(cb){
    // Make a relative pose
    var x = item_mesh.position.z / 1000;
    var y = item_mesh.position.x / 1000;
    var a = item_mesh.rotation.y;
    var pa = Robot.pa;
    var ca = Math.cos(pa);
    var sa = Math.sin(pa);
    var px = x - Robot.px;
    var py = y - Robot.py;
    var wp_x =  ca*px + sa*py;
    var wp_y = -sa*px + ca*py;
    var wp_a = Transform.mod_angle(a - Robot.pa);
    //
    var wp = [wp_x,wp_y,wp_a];
    console.log('Waypoint!',wp);
    qwest.post(fsm_url,{fsm: 'BodyFSM' , evt: 'follow', shm:'hcm', segment: 'motion',key:'waypoints', val:JSON.stringify(wp)});
    
    // Reset the actual
    model2_loop();
  }
  // get the mesh
  Waypoint.get_mod_mesh = function(){
    return item_mesh;
  }
  Waypoint.set = function(p,pa){
    item_mesh.position.copy(p);
    item_mesh.position.y = 0;
    item_mesh.rotation.y = pa;
  }
  Waypoint.get_robot = function(){
    return three_to_model();
  }
  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  Waypoint.item_name = 'Waypoint';
	ctx.Waypoint = Waypoint;

})(this);