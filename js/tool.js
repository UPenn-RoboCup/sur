/*****
 * 3D tool model
 */
(function(ctx){
  
  // Function to hold methods
  function Tool(){}
  // For manipulation
  Tool.item_name = 'Tool';
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
    console.log('item angle',item_angle);
    // Points in THREEjs to torso frame
    var model = Transform.three_to_torso(item_mesh.position,Robot);
    model.push(item_angle.y);
    console.log('Model',model)
    qwest.post( rpc_url, {val:JSON.stringify(model)} );
  }
  
  ///////////////////////
  // object manipulation API
  // set up the intersection handler
  // point in THREEjs: p
  // point in robot: r
  Tool.select = function(p,r){
    // Set the position
    item_mesh.position.copy(p);
    // Add to the world
    World.add(item_mesh);
    // Re-render
    World.render();
    // 
    send_model_to_robot()
  }
  Tool.clear = function(){
    // Stop modifying
    Wheel.stop_modify();
    // Remove the tool
    World.remove(item_mesh);
    // Re render the scene
    World.render();
  }
  Tool.start_modify = function(){
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
  Tool.stop_modify = function(){
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
  
  Tool.setup = function(){
  }

  // export
	ctx.Tool = Tool;

})(this);