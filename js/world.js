// Setup the THREE scene
var stats, controls, tcontrols=[];
// special objects
var foot_floor, foot_steps, foot_geo, foot_mat, waypoints = [];
// particle system and mesh
var particleSystem, mesh;

/*
// Make the footstep queue
// TODO: Use underscore to remove arbitrary footsteps
foot_geo = new THREE.CubeGeometry( 50, 10, 100 );
foot_mat = new THREE.MeshLambertMaterial({
  color: 0xFFAAAA
});
foot_steps = []
*/

/*****
 * 3D World for the robot scene
 */
(function(ctx){
  
  // Function to hold methods
  function World(){}
  
  var CANVAS_WIDTH, CANVAS_HEIGHT;
  var camera, renderer, scene;
  // Add the webworker
  var mesh_worker = new Worker("js/mesh_worker.js");
  
  // Where to look initially
  var lookTarget = new THREE.Vector3(0,1000,1000);
  
  // animation takes care of the controls, and is a helper
  var animate = function(){
    // request itself again
    for(var i=0,j=tcontrols.length;i<j;i++){tcontrols[ i ].update();}
    controls.update();
    World.render();
  };
  
  World.handle_events = function(){
    // double clicking the scene
    // add event for picking the location of a click on the plane
    container.addEventListener( 'dblclick', select_footstep, false );
  }
  
  World.append_floor = function(){
    var floor_material = new THREE.MeshPhongMaterial({
      ambient: 0x555555, specular: 0x111111, shininess: 200,
      side: THREE.DoubleSide,
      color: 0x7F5217, // red dirt
    });
    var floor = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000),
      floor_material
    );
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);
  }
  
  World.setup = function(){
    // Grab the container
    var container = document.getElementById( 'world_container' );
    CANVAS_WIDTH = container.clientWidth;
    CANVAS_HEIGHT = container.clientHeight;

    // setup the camera
    camera = new THREE.PerspectiveCamera( 60, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1e6 );
    camera.position.z = 0;
    camera.position.y = 2000;

    // setup OrbitControls to move around the view
    controls = new THREE.OrbitControls( camera, container );
    controls.addEventListener( 'change', World.render );
    controls.target = lookTarget;

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
      var container = document.getElementById( 'three_container' );
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
    animate();
  }
  
  World.handle_webworker = function(){
    // Start the webworker
    mesh_worker.onmessage = function(e) {
      // The message is the mesh
      var position = new Float32Array(e.data.pos,0,3*e.data.n_el);
      var color    = new Float32Array(e.data.col,0,3*e.data.n_el);
      var index    = new Uint16Array(e.data.idx,0,6*e.data.n_quad);
      var offset   = e.data.quad_offsets;
      // Make the Mesh or particle system
      var mesh = make_mesh(index,position,color,offset);
      scene.add( mesh );
      //var particleSystem = make_particle_system(position, color);
      //scene.add( particleSystem );
      // render the particle system change
      World.render();
    };
  }
  
  World.render = function(){
    // render the scene using the camera
    renderer.render( scene, camera );
  }
  
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
  
  // export
	ctx.World = World;

})(this);