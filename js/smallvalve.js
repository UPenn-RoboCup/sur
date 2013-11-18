/*****
 * 3D wheel model
 */
(function(ctx){
  
  // Function to hold methods
  function SmallValve(){}
  // For manipulation
  SmallValve.item_name = 'SmallValve';
  SmallValve.grab_evt = 'smallvalvegrab';
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
    
    // Make the hcm model from the mesh
    var hcm_model = make_model();
    
    // Send the updated model to the robot
    qwest.post( rpc_url, {val:JSON.stringify(hcm_model)} );

  }
  SmallValve.clear = function(){
    // Nothing happens on clear...
  }
  
  SmallValve.start_modify = function(){
    // stop the normal controls
    World.disable_orbit();
    // grab a tcontrol
    tcontrol = World.generate_tcontrol();
    // Setup the transformcontrols
    tcontrol.addEventListener( 'change', World.render );
    tcontrol.attach( item_mesh );
    World.add( tcontrol );
    // listen for a keydown
    ctx.addEventListener( 'keydown', update_tcontrol, false );
    // Re-render
    World.render();
  }; // start_modify
  SmallValve.stop_modify = function(){
    if(tcontrol===null){return;}
    World.remove( tcontrol );
    tcontrol.detach( item_mesh );
    tcontrol.removeEventListener( 'change', World.render );
    tcontrol = null;
    ctx.removeEventListener( 'keydown', update_tcontrol, false );
    World.enable_orbit();
    // re-render
    World.render();
  }
  
  SmallValve.init = function(){
    // Get the model from the robot (could be pesky...?)
    qwest.get( rpc_url,{},{},function(){
      // Use a 1 second timeout for the XHR2 request for getting the model
      this.timeout = 1000; // ms
    })
    .success(function(model){
      model_to_three(model);
      World.add(item_mesh);
      World.render();
    })
    .error(function(msg){
      // default door model
      model_to_three();
      World.add(item_mesh);
      World.render();
    })
    // Add the item back to the scene
  }
  Door.deinit = function(){
    World.remove(item_mesh);
  }
  
  ///////////////////////

  // export
	ctx.SmallValve = SmallValve;

})(this);