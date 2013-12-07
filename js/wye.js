(function(ctx){
  
  // Function to hold methods
  function Wye(){}

  //////////////
  // RPC URLs //
  //////////////
  var rpc_url = rest_root+'/m/hcm/hoseattach/model';

  // Relative waypoint offset in ROBOT coordinates
  // but with THREE scale (mm)
  var offset = new THREE.Vector2(400,100);
  
  /////////////////////
  // Mesh definition //
  /////////////////////
  var item_angle = new THREE.Euler();
  // master
  var item_mat = new THREE.MeshLambertMaterial({color: 0xFF0000});
  var item_geo = new THREE.CylinderGeometry(44.5,44.5,50,12,1,false);
  var item_mesh = new THREE.Mesh( item_geo, item_mat );
  item_mesh.rotation.set(Math.PI/2,0,0);
  
  //////////////////////
  // Model converters //
  //////////////////////
  var three_to_model = function(){
    // Acquire the model
    item_angle.setFromQuaternion(item_mesh.quaternion);
    // Points in THREEjs to torso frame
    var model = Transform.three_to_torso(item_mesh.position,Robot);
    
    // TODO: Must make a relative yaw angle
    //model.push(item_angle.y);
    
    model.push(0);
    console.log('Wye',model);
    return model;
  }
  var model_to_three = function(model){
    //var yaw = 
  }
  
  // Adjust the waypoint to the *perfect* position
  var wp_callback = function(){
    // Grab the (global) orientation of the mesh
    var pa = item_mesh.rotation.z;
    // Acquire the position of the tip:
    var p = (new THREE.Vector3()).copy(item_mesh.position);
    
    // Make the global offset from the object    
    var dx = offset.x*Math.cos(pa) + offset.y*Math.sin(pa);
    var dy = offset.y*Math.cos(pa) - offset.x*Math.sin(pa);

    // Change the THREE coordinates of the desired waypoint
    p.x -= dy;
    p.z -= dx;

    // Update the Waypoint in the scene
    Waypoint.set(p,pa);

  }

  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  Wye.select = function(p,r){
    // Set the position
    item_mesh.position.copy(p);
    // Re-render
    
  }
  Wye.clear = function(){

  }
  Wye.init = function(){
    // Set the default position relative to the robot
    
    // Make the global offset from the object
    var pa = Robot.pa;
    var dx = offset.x*Math.cos(pa) + offset.y*Math.sin(pa);
    var dy = offset.y*Math.cos(pa) - offset.x*Math.sin(pa);
    // Set mesh
    item_mesh.position.x = Robot.py*1000+dy;
    item_mesh.position.z = Robot.px*1000+dx;
    item_mesh.position.y = (Robot.bodyHeight + 0.10)*1000;
    // Add to the world
    World.add(item_mesh);
  }
  Wye.deinit = function(){
    // Add to the world
    World.remove(item_mesh);
  }
  Wye.send = function(){
    var model = three_to_model();
    //qwest.post( rpc_url, {val:JSON.stringify(model)} );
  }
  Wye.get_mod_mesh = function(){
    return item_mesh;
  }
  Wye.loop = function(){
    
  }
  Wye.mod_callback = function(){
    wp_callback();
  }
  Wye.gen_wp = function(){
    // yield the optimal waypoint
  }
  Wye.add_buttons = function(holder){
    // Grab
    var grab = document.createElement('a');
    grab.classList.add('big');
    grab.classList.add('button');
    grab.id = 'hose_grab';
    grab.href = '#';
    grab.textContent = 'Grab';
    holder.appendChild(grab);
    clicker(grab,function(){
      qwest.post(fsm_url,{fsm: 'ArmFSM', evt: 'hosegrab'});
    });
  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  Wye.item_name = 'Wye';
  // export
	ctx.Wye = Wye;

})(this);