/*****
 * 3D World for the robot scene
 */
(function(ctx){
  
  // Function to hold methods
  function World(){}
  
  var MAX_NUM_MESHES = 3;
  
  var CANVAS_WIDTH, CANVAS_HEIGHT;
  var camera, renderer, scene, container, controls = null;
  World.is_robot_camera = false;
  
  // save items
  var meshes = [], items = [];
  World.items = items;
  World.meshes = meshes;
  
  // Where to look initially
  var lookPosition = new THREE.Vector3(500,2000,-500);
  var lookTarget   = new THREE.Vector3(0,0,500);
  
  World.add = function(item){
    scene.add(item);
  }
  World.remove = function(item){
    scene.remove(item);
  }
  
  World.render = function(){
    // render the scene using the camera
    if(World.is_robot_camera){
      renderer.render( scene, Robot.head_camera );
      return;
    }
    // TODO: called too much?
    if(controls!=null){controls.update();}
    renderer.render( scene, camera );
  }
  
  World.set_view = function(pos,target){
    if(pos=='robot'){
      World.is_robot_camera = true;
    } else {
      World.is_robot_camera = false;
      // cam position
      lookPosition.fromArray(pos);
      camera.position.copy(lookPosition);
      // target
      lookTarget.fromArray(target);
      controls.target = lookTarget;
      // update and render
      controls.update();
    }
  }
  
  // Transform control generator
  World.generate_tcontrol = function(){
    var tcontrol = new THREE.TransformControls( camera, container );
    return tcontrol;
  }
  
  // Stop moving the view
  World.disable_orbit = function(){
    controls.enabled = false;
//    controls.removeEventListener('change', World.render);
    controls = null;
  }
  World.enable_orbit = function(){
    // setup OrbitControls to move around the view
    controls = new THREE.OrbitControls( camera, container );
//    controls.addEventListener( 'change', World.render );
    controls.target = lookTarget;
    controls.update();
  }
  //
  World.intersection_callback = null;
  
  // This is the intersection function
  var intersect_world = function(e){
    var event = e.gesture.touches[0];
    // if no callback, then do nothing
    if(typeof World.intersection_callback!=="function"){ return; }    
    // find the mouse position (use NDC coordinates, per documentation)
    var mouse_vector = new THREE.Vector3(
      ( event.offsetX / CANVAS_WIDTH ) * 2 - 1,
      -( event.offsetY / CANVAS_HEIGHT ) * 2 + 1);
    //console.log('Mouse',mouse_vector); // need Vector3, not vector2
    var projector = new THREE.Projector();
    //console.log('projector',projector)
    var raycaster = null;
    if(World.is_robot_camera){
      raycaster = projector.pickingRay(mouse_vector,Robot.head_camera);
    } else {
      raycaster = projector.pickingRay(mouse_vector,camera);
    }
    //console.log('picking raycaster',raycaster)
    // intersect the plane
    var intersections = raycaster.intersectObjects( items.concat(meshes) );
    // if no intersection
    //console.log(intersection)
    if(intersections.length==0){ return; }
    // only give the first intersection point
    var p = intersections[0].point;
    // get the robot point
    var r = Transform.three_to_torso(p, Robot);
    
    // debugging
    console.log('Intersection:',p,r);
    
    // apply the callback
    World.intersection_callback(p,r);
  }
  
  // Handle doubleclicks - possibly more
  World.handle_intersection = function( cb ){
    // Change the callback for calculating the intersection
    //container.removeEventListener( 'dblclick', intersect_world, false );
    World.intersection_callback = cb;
    // add event for picking the location of a double click on the plane
    //container.addEventListener( 'dblclick', intersect_world, false );
  }
  
  World.append_floor = function(){
    var floor_mat = new THREE.MeshLambertMaterial({
      ambient: 0x555555, specular: 0x111111, shininess: 200,
      side: THREE.DoubleSide,
      color: 0x7F5217, // red dirt
    });
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(100000, 100000),floor_mat);
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);
    // Save in the world items
    items.push(floor);
  }
  
  World.setup = function(){
    
    // Grab the container
    container = document.getElementById( 'world_container' );
    
    // Double clicking for the intersection
    Hammer(container).on("doubletap", intersect_world);
    
    CANVAS_WIDTH = container.clientWidth;
    CANVAS_HEIGHT = container.clientHeight;
    /*
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;
    */
    // setup the camera
    camera = new THREE.PerspectiveCamera( 75, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1e6 );
    camera.position.copy(lookPosition);

    // make the scene
    scene = new THREE.Scene();

    // add light to the scene, from the robot's point of view
    var dirLight = new THREE.DirectionalLight( 0xffffff );
    dirLight.position.set( 0, 1000, 0 ).normalize();
    scene.add( dirLight );

    // ambient light for the whole scene
    // TODO: Move the light with the robot
    // ground
    var light = new THREE.PointLight( 0xffffff, 1, 10000 );
    light.position.set( 0, 0, 0 );
    scene.add( light );
    // sky
    var light2 = new THREE.PointLight( 0xaaaaaa, 1, 100000 );
    light2.position.set( 0, 70000, 1000 );
    scene.add( light2 );

    // make the renderer
    renderer = new THREE.WebGLRenderer( { antialias: false } );
    var night_blue = 0x001133;
    var sky_blue   = 0x80CCFF;
    renderer.setClearColor( sky_blue, 1 );
    renderer.setSize( CANVAS_WIDTH, CANVAS_HEIGHT );
    // add the rendered to the dom
    container.appendChild( renderer.domElement );

    // handle resizing
    window.addEventListener( 'resize', function() {
      // update the width/heightheight: 100%;
      CANVAS_WIDTH  = container.clientWidth;
      CANVAS_HEIGHT = container.clientHeight;
      /*
      CANVAS_WIDTH = window.innerWidth;
      CANVAS_HEIGHT = window.innerHeight;
      */
      // update the camera view
      camera.aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
      camera.updateProjectionMatrix();
      // Set the rendering size
      renderer.setSize( CANVAS_WIDTH, CANVAS_HEIGHT );
      // re-render
      //World.render();
    }, false );
    
    // handle buttons
    handle_buttons();
    
    // initial update
    // Enable orbiting
    World.enable_orbit();
    
    // render
    //World.render();
    
    // Spacemouse
    var sp = {
      left: 0,
      up: 0,
      dx: 0,
      dy: 0,
      dz: 0,
    }
    // re-rendering
    var sp_rot = [0,0];
    var sp_controls_up = function(){
      if(controls===null){return;}
      // Rotations
      controls.rotateLeft(sp.left);
      controls.rotateUp(sp.up);
      // Target translations
      controls.target.x += sp.dx;
      controls.target.y += sp.dy;
      controls.target.z += sp.dz;
      // Camera translation, too
      controls.object.position.x += sp.dx;
      controls.object.position.y += sp.dy;
      controls.object.position.z += sp.dz;
      controls.update();
      // reset
      sp = {left: 0,up: 0,dx: 0,dy: 0,dz: 0,}
    }
    // Connect to the websocket server
    var port = 9012;
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.binaryType = "arraybuffer";
    ws.onopen = function(e){
      // perform the setTimeout for constant rendering
      var intervalID = ctx.setInterval(sp_controls_up, 30);
    }
    ws.onmessage = function(e){
      // Nothing to do if no orbit controls
      
      var sp_mouse = JSON.parse(e.data);
      //console.log('sp',e.data)
      
      // Buttons can do special things... zoom only? switch cameras?
      
      // Updating the controls
      if(controls===null){return;}
      if(sp_mouse.wz){
        // Rotation around the target
        sp.left = sp_mouse.wz/300;
        sp.up   = sp_mouse.wy/300;
      } else if(sp_mouse.z){
        // Translation of the target
        sp.dx = sp_mouse.x/300;
        sp.dy = sp_mouse.y/300;
        sp.dz = sp_mouse.z/300;
      }
      
    };
    
  }
  
  // mesh generation helpers
  // BufferGeometry of the mesh
  var make_mesh = function(index,position,color,offsets,old_mesh){
    // Remove old mesh if present
    if(old_mesh!==undefined){
      scene.remove( old_mesh );
      old_mesh.geometry.dispose();
    }
    var geometry = new THREE.BufferGeometry();
    // Dynamic, because we will do raycasting
    geometry.dynamic = true;
    // Use our given offsets
    geometry.offsets = offsets;
    // Set the attribute buffers
    geometry.attributes = {
      index: {
        itemSize: 1,
        array: index,
      },
      position: {
        itemSize: 3,
        array: position,
      },
      color: {
        itemSize: 3,
        array: color,
      },
    }
    // for picking via raycasting
    geometry.computeBoundingSphere();
    // Phong Material requires normals for reflectivity
    geometry.computeVertexNormals()
    var material = new THREE.MeshPhongMaterial({
      ambient: 0x555555, specular: 0x111111, shininess: 200,
      side: THREE.DoubleSide,
      color: 0x00CC00,
      //vertexColors: THREE.VertexColors, // if not phong...
    });

    // Make the new mesh, and return to the user
    var mesh = new THREE.Mesh( geometry, material );
    return mesh;
  }

  // Update the particle system
  var make_particle_system = function(position,color,old_particles){
    scene.remove( old_particles );
    old_particles.geometry.dispose();
    
    // Dynamic, because we will do raycasting? just for mesh?
    var geometry = new THREE.BufferGeometry();
    geometry.dynamic = true;
    geometry.attributes = {
      position: {
        itemSize: 3,
        array: position
      },
      color: {
        itemSize: 3,
        array: color
      }
    } // geom attr
    // default size: 1 cm
    var mat = new THREE.ParticleBasicMaterial({ size: 5, vertexColors: true });
    var particleSystem = new THREE.ParticleSystem( geometry, mat );
    return particleSystem;
  }
  
  var process_lidar_results = function(el){
    // The message is the mesh
    var position = new Float32Array(el.pos,0,3*el.n_el);
    var color    = new Float32Array(el.col,0,3*el.n_el);
    var index    = new Uint16Array(el.idx,0,6*el.n_quad);
    var offset   = el.quad_offsets;
    // Make the Mesh or particle system
    var mesh = make_mesh(index,position,color,offset);
    scene.add(mesh);
    meshes.push(mesh);
    if(meshes.length>MAX_NUM_MESHES){
      // remove first element
      var old_mesh = meshes.shift();
      scene.remove(old_mesh);
      old_mesh.geometry.dispose();
    }
    //var particleSystem = make_particle_system(position, color);
    //scene.add( particleSystem );
    // render the particle system change
    //World.render();
  }
  
  World.clear_meshes = function(){
    for(var i=0, j=meshes.length; i<j; i++){scene.remove(meshes[i]);}
    meshes = [];
    //World.render();
  }
  
  // From the mesh websockets listener to rendering
  World.digest_mesh = function( mesh ){
    var buf = mesh.ctx.getImageData(1, 1, mesh.width, mesh.height).data.buffer;
    mesh.buf = buf;
    // Remove illegal worker objects
    var ctx = mesh.ctx;
    mesh.ctx = null;
    var raw = mesh.raw;
    mesh.raw = null;
    // Post the object
    mesh_worker.postMessage(mesh,[buf]);
    // Restore the objects
    mesh.ctx = ctx;
    mesh.raw = raw;

/*    
    // Not using WebWorkers (for debugging)
    var el = Transform.make_quads(mesh);
    process_lidar_results(el);
*/
    
  }
  
  // Add the webworker
  var mesh_worker = new Worker("js/mesh_worker.js");
  mesh_worker.onmessage = function(e) {
    process_lidar_results(e.data);
  };
  
  var handle_buttons = function(){
    clicker('vantage_def',function() {
      // pos then target
      World.set_view([500,2000,-500],[0,0,500]);
    });
    clicker('vantage_top',function() {World.set_view([0,2000,500],[0,0,501]);});
    clicker('vantage_chest',function() {
      var dz = 1000*Robot.bodyHeight / Math.tan(Robot.bodyTilt);
      World.set_view([0,Robot.bodyHeight*1000,220],[0,0,dz]);
    });
    clicker('vantage_item',function() {
      var v = Manipulation.get_vantage();
      World.set_view(v.position,v.target);
    });
    clicker('vantage_robot',function(){
      World.set_view('robot');
    });
  }
  
  // export
	ctx.World = World;

})(this);