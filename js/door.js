/*****
 * 3D door model
 */
(function(ctx){
  
  // Function to hold methods
  function Door(){}
  // For manipulation
  Door.item_name = 'Door';
  // Sending to the robot
  var rpc_url = rest_root+'/m/hcm/door/model'
  
  var item_angle = new THREE.Euler();
  var item_mesh;
  
  // hcm (i.e. robot) coordinates in meters
  // Should be a function of two indicator points, like wheel
  
  var make_door = function(radius,dx,dz,yaw){
    // make the master item (i.e. hinge)
    var door_height = 2;
    var item_mat = new THREE.MeshPhongMaterial({color: 0xFFFFFF,emissive:0x333333});
    var item_geo = new THREE.CylinderGeometry(25,25,door_height*1000,8,1,false);
    // Door itself
    var door_width = 1000*(radius+.050);
    
    var door_thinkness = 30;
    var item3_mesh = new THREE.Mesh(
      new THREE.CubeGeometry(door_width,door_height*1000,door_thinkness)
    );
    item3_mesh.position.set(door_width/2,0,0);
    THREE.GeometryUtils.merge( item_geo, item3_mesh );
    
    // Door handle
    var off_x = radius*1000;
    var off_y = (dz-door_height/2)*1000;
    var off_z = dx*1000;
    var item2_mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(15,15,off_z,12,1)
    );
    // This also used as tmp variable
    item_angle = new THREE.Euler( Math.PI/2, 0, 0 );
    item2_mesh.quaternion.setFromEuler( item_angle );
    item2_mesh.position.set(off_x,off_y,-(off_z+door_thinkness)/2);
    THREE.GeometryUtils.merge( item_geo, item2_mesh );
  
    // Door handle
    var handle_width = 100;
    var item4_mesh = new THREE.Mesh(new THREE.CubeGeometry(100,15,10));
    item4_mesh.position.set(off_x-handle_width/2,off_y,-off_z-(door_thinkness+10)/2);
    THREE.GeometryUtils.merge( item_geo, item4_mesh );
    
    // mesh, with some rotation
    item_mesh = new THREE.Mesh( item_geo, item_mat );
    item_angle.x = 0;
    item_angle.y = yaw;
    item_angle.z = 0;
    item_mesh.quaternion.setFromEuler( item_angle );

  }
  
  // Instantiate the master
  make_door(.7,0.10,1,Math.PI/6);

  // TransformControl
  var tcontrol = null;
  var update_tcontrol = function ( event ) {
    switch ( event.keyCode ) {
      case 81: // Q
        tcontrol.setSpace( tcontrol.space == "local" ? "world" : "local" );
        break;
      case 87: // W
        tcontrol.setMode( "translate" );
        break;
      case 69: // E
        tcontrol.setMode( "rotate" );
        break;
      case 82: // R
        tcontrol.setMode( "scale" );
        break;
      // size stuff
      case 187:
      case 107: // +,=,num+
        tcontrol.setSize( tcontrol.size + 0.1 );
        break;
      case 189:
      case 10: // -,_,num-
        tcontrol.setSize( Math.max(tcontrol.size - 0.1, 0.1 ) );
        break;
    }
  };
  
  var send_model_to_robot = function(){
    // Acquire the model
    item_angle.setFromQuaternion(item_mesh.quaternion);
    // Points in THREEjs to torso frame
    var model = Transform.three_to_torso(item_mesh.position,Robot);
    model.push(item_angle.y);
    qwest.post( rpc_url, {val:JSON.stringify(model)} );
  }
  
  ///////////////////////
  // object manipulation API
  // set up the intersection handler
  // point in THREEjs: p
  // point in robot: r
  Door.select = function(p,r){
    // Set the position
    item_mesh.position.copy(p);
    // Add to the world
    World.add(item_mesh);
    // Re-render
    World.render();
    // 
    send_model_to_robot();
  }
  Door.clear = function(){
    // Stop modifying
    Wheel.stop_modify();
    // Remove the tool
    World.remove(item_mesh);
    // Re render the scene
    World.render();
  }
  Door.start_modify = function(){
    // stop the normal controls
    World.disable_orbit();
    // grab a tcontrol
    tcontrol = World.generate_tcontrol();
    // Setup the transformcontrols
    tcontrol.addEventListener( 'change', World.render );
    //tcontrol.addEventListener( 'modify', update_angle );
    tcontrol.attach( item_mesh );
    World.add( tcontrol );
    // listen for a keydown
    ctx.addEventListener( 'keydown', update_tcontrol, false );
    // Re-render
    World.render();
  }; // start_modify
  Door.stop_modify = function(){
    if(tcontrol===null){return;}
    World.remove( tcontrol );
    tcontrol.detach( item_mesh );
    tcontrol.removeEventListener( 'change', World.render );
    //tcontrol.removeEventListener( 'modify', update_angle );
    tcontrol = null;
    ctx.removeEventListener( 'keydown', update_tcontrol, false );
    World.enable_orbit();
    // re-render
    World.render();
    // Send to the robot
    send_model_to_robot();
  }
  ///////////////////////
  
  Door.setup = function(){
  }

  // export
	ctx.Door = Door;

})(this);