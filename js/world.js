/*****
 * 3D World for the robot scene
 */
(function(ctx){
  
  // Function to hold methods
  function World(){}
  
  var MAX_NUM_MESHES = 5;
  
  var CANVAS_WIDTH, CANVAS_HEIGHT;
  var camera, renderer, scene, container, controls;
  
  // save items
  var meshes = [], items = [];
  
  // Where to look initially
  var lookTarget = new THREE.Vector3(0,1000,1000);
  
  World.add = function(item){
    scene.add(item);
  }
  World.remove = function(item){
    scene.remove(item);
  }
  
  World.render = function(){
    // render the scene using the camera
    renderer.render( scene, camera );
  }
  
  // Transform control generator
  World.generate_tcontrol = function(){
    return new THREE.TransformControls( camera, container );
  }
  
  // Stop moving the view
  World.disable_orbit = function(){
    controls.enabled = false;
    controls.removeEventListener('change', World.render);
    controls = null;
  }
  World.enable_orbit = function(){
    // setup OrbitControls to move around the view
    controls = new THREE.OrbitControls( camera, container );
    controls.addEventListener( 'change', World.render );
    controls.target = lookTarget;
    controls.update();
  }
  //
  World.intersection_callback = null;
  
  // This is the intersection function
  var intersect_world = function(event){
    // if no callback, then do nothing
    if(typeof World.intersection_callback!=="function"){ return; }
    // find the mouse position (use NDC coordinates, per documentation)
    var mouse_vector = new THREE.Vector3(
      ( event.offsetX / CANVAS_WIDTH ) * 2 - 1,
      -( event.offsetY / CANVAS_HEIGHT ) * 2 + 1);
    //console.log('Mouse',mouse_vector); // need Vector3, not vector2
    var projector = new THREE.Projector();
    //console.log('projector',projector)
    var raycaster = projector.pickingRay(mouse_vector,camera);
    //console.log('picking raycaster',raycaster)
    // intersect the plane
    var intersections = raycaster.intersectObjects( items.concat(meshes) );
    // if no intersection
    //console.log(intersection)
    if(intersections.length==0){ return; }
    // only give the first intersection point
    var p = intersections[0].point;
    // get the robot point
    var r = Transform.three_to_torso(p);
    // apply the callback
    World.intersection_callback(p,r);
  }
  
  // Handle doubleclicks - possibly more
  World.handle_events = function( cb ){
    // Change the callback for calculating the intersection
    container.removeEventListener( 'dblclick', intersect_world, false );
    World.intersection_callback = cb;
    // add event for picking the location of a double click on the plane
    container.addEventListener( 'dblclick', intersect_world, false );
  }
  
  World.append_floor = function(){
    var floor_mat = new THREE.MeshLambertMaterial({
      ambient: 0x555555, specular: 0x111111, shininess: 200,
      side: THREE.DoubleSide,
      color: 0x7F5217, // red dirt
    });
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000),floor_mat);
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);
    // Save in the world items
    items.push(floor);
  }
  
  World.setup = function(){
    // Grab the container
    container = document.getElementById( 'world_container' );
    CANVAS_WIDTH = container.clientWidth;
    CANVAS_HEIGHT = container.clientHeight;

    // setup the camera
    camera = new THREE.PerspectiveCamera( 60, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1e6 );
    camera.position.z = 0;
    camera.position.y = 2000;

    // make the scene
    scene = new THREE.Scene();

    // add light to the scene, from the robot's point of view
    var dirLight = new THREE.DirectionalLight( 0xffffff );
    dirLight.position.set( 0, 1000, 0 ).normalize();
    scene.add( dirLight );

    // ambient light for the whole scene
    var light = new THREE.PointLight( 0xffffff, 1, 10000 );
    light.position.set( 0, 0, 0 );
    scene.add( light );

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
      // update the width/height
      CANVAS_WIDTH  = container.clientWidth;
      CANVAS_HEIGHT = container.clientHeight;
      // update the camera view
      camera.aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
      camera.updateProjectionMatrix();
      // Set the rendering size
      renderer.setSize( CANVAS_WIDTH, CANVAS_HEIGHT );
      // re-render
      World.render();
    }, false );
    
    // initial update
    // Enable orbiting
    World.enable_orbit();
    
    // render
    World.render();
  }
  
  // mesh generation helpers
  // BufferGeometry of the mesh
  var make_mesh = function(index,position,color,offsets,old_mesh){
    // Remove old mesh if present
    scene.remove( old_mesh );
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
    }
    //var particleSystem = make_particle_system(position, color);
    //scene.add( particleSystem );
    // render the particle system change
    World.render();
  }
  
  // From the mesh websockets listener to rendering
  World.digest_mesh = function( mesh ){
    var buf = mesh.ctx.getImageData(1, 1, mesh.width, mesh.height).data.buffer;
    mesh.buf = buf;
    
    /*
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
    */
    
    // Not using WebWorkers (for debugging)
    var el = Transform.make_quads(mesh);
    process_lidar_results(el);
  }
  
  // Add the webworker
  var mesh_worker = new Worker("js/mesh_worker.js");
  mesh_worker.onmessage = function(e) {
    var el = e.data;
    process_lidar_results(el);
  };
  
  // export
	ctx.World = World;

})(this);