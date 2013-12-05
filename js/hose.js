(function(ctx){
  
  // Function to hold methods
  function Hose(){}

  //////////////
  // RPC URLs //
  //////////////
  var rpc_url = rest_root+'/m/hcm/hose/model';
  
  /////////////////////
  // Mesh definition //
  /////////////////////
  var item_angle = new THREE.Euler();
  // master
  var item_mat = new THREE.MeshLambertMaterial({color: 0xAAAAAA});
  var item_geo = new THREE.CylinderGeometry(44.5,44.5,25.4,12,1,false);
  var item_mesh = new THREE.Mesh( item_geo, item_mat );
  // Non-spinning piece
  var no_spin_mat = new THREE.MeshLambertMaterial({color: 0x444444});
  var no_spin_geo = new THREE.CylinderGeometry(44.5,44.5,50.0,12,1,false);
  var no_spin_mesh = new THREE.Mesh( no_spin_geo, no_spin_mat );
  no_spin_mesh.position.y = -25.4/2 - 50/2;
  // Mesh Tube
  var tube_mat = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
  var tube_geo = new THREE.CubeGeometry(80,100,10);
  var tube_mesh = new THREE.Mesh( tube_geo, tube_mat );
  tube_mesh.position.y = -50.0/2 - 60/2;
  // North Nub
  var nub_mat = new THREE.MeshBasicMaterial({color: 0x888888});
  var nub_geo = new THREE.CubeGeometry(10,25.4,10);
  var nub_mesh = new THREE.Mesh( nub_geo, nub_mat );
  nub_mesh.position.z = 44.4 + 10/2;
  // Scene graph time!
  no_spin_mesh.add(tube_mesh);
  item_mesh.add(no_spin_mesh);
  item_mesh.add(nub_mesh);
  
  //////////////////////
  // Model converters //
  //////////////////////
  var three_to_model = function(){
    // Acquire the model
    item_angle.setFromQuaternion(item_mesh.quaternion);
    // Points in THREEjs to torso frame
    var model = Transform.three_to_torso(item_mesh.position,Robot);
    model.push(item_angle.y);
    console.log('Hose',model);
    return model;
  }
  var model_to_three = function(model){
    //var yaw = 
  }
  
  /////////////////////////////
  // Object manipulation API //
  /////////////////////////////
  Hose.select = function(p,r){
    // Set the position
    item_mesh.position.copy(p);
    // Re-render
    
  }
  Hose.clear = function(){

  }
  Hose.init = function(){
    // Add to the world
    World.add(item_mesh);
  }
  Hose.deinit = function(){
    // Add to the world
    World.remove(item_mesh);
  }
  Hose.send = function(){
    var model = three_to_model();
    //qwest.post( rpc_url, {val:JSON.stringify(model)} );
  }
  Hose.get_mod_mesh = function(){
    return item_mesh;
  }
  Hose.loop = function(){
    
  }
  Hose.mod_callback = function(){
    
  }
  Hose.gen_wp = function(){
    // yield the optimal waypoint
  }
  Hose.add_buttons = function(holder){
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
    // Hold
    var grab = document.createElement('a');
    grab.classList.add('big');
    grab.classList.add('button');
    grab.id = 'hose_hold';
    grab.href = '#';
    grab.textContent = 'Hold';
    holder.appendChild(grab);
    clicker(grab,function(){
      qwest.post(fsm_url,{fsm: 'ArmFSM', evt: 'hold'});
    });
  }

  /////////////////////////
  // Metadata and Export //
  /////////////////////////
  Hose.item_name = 'Hose';
  // export
	ctx.Hose = Hose;

})(this);