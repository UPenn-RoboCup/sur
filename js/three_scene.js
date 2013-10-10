// Setup the THREE scene
var scene, renderer, camera, stats, controls;
// special objects
var foot_floor, foot_steps, foot_geo, foot_mat;
// particle system
var particleSystem
var CANVAS_WIDTH, CANVAS_HEIGHT;
document.addEventListener( "DOMContentLoaded", function(){
  var container = document.getElementById( 'three_container' );
  if(container===undefined){return;}
  CANVAS_WIDTH = container.clientWidth;
  CANVAS_HEIGHT = container.clientHeight;

  // Look at things!
  var lookTarget = new THREE.Vector3(0,0,0);

  // add the camera
  camera = new THREE.PerspectiveCamera( 60, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1e6 );
  // add the camera to the scene
  camera.position.z = 0;
  camera.position.y = bodyHeight*1000;

  // add controls
  controls = new THREE.OrbitControls( camera, container );
  controls.addEventListener( 'change', render );
  //controls.center = new THREE.Vector3(0,0,1000);
  controls.target = new THREE.Vector3(0,0,1000);// look in front one meter
  //controls.addEventListener('change',function(){requestAnimationFrame( animate )});

  // make the scene
  scene = new THREE.Scene();

  // add light to the scene
  var dirLight = new THREE.DirectionalLight( 0xffffff );
  dirLight.position.set( 0, 1000, 0 ).normalize();
  scene.add( dirLight );

  // re-add?
  renderer = new THREE.WebGLRenderer( { antialias: false } );
  renderer.setClearColor( 0x005500, 1 );
  renderer.setSize( CANVAS_WIDTH, CANVAS_HEIGHT );
  // Add to the container
  container.appendChild( renderer.domElement );

  // fps stats  
  stats = new Stats();
  //container.appendChild( stats.domElement );

  ///////////////
///////////////
var sphereMaterial =
  new THREE.MeshLambertMaterial(
    {
      color: 0xFF0000
    });
var wireMaterial = new THREE.MeshBasicMaterial({
  //wireframe: true,
  color: 0x555555
})
// set up the sphere vars
var radius = 100,
    segments = 16,
    rings = 16;

var pl_width = 5000, pl_height = 5000, pl_seg = 100;

// create a new mesh with
// sphere geometry - we will cover
// the sphereMaterial next!

var sphere = new THREE.Mesh(
  new THREE.SphereGeometry(
    radius,
    segments,
    rings),
  sphereMaterial);
//scene.add(sphere);

foot_floor = new THREE.Mesh(
new THREE.PlaneGeometry(pl_width, pl_height),wireMaterial);
//foot_floor.material.side = THREE.DoubleSide;
//foot_floor.rotation.set(Math.PI/2, 0,0);
foot_floor.rotation.x = -Math.PI/2;
//foot_floor.position.y = ;
scene.add(foot_floor);
// move it around in the scene
//mesh.position = new THREE.Vector3(100, 100, 100)
// foot_floor.rotation.set(Math.PI/2, 0,0);

// Make the footstep queue
// TODO: Use underscore to remove arbitrary footsteps
foot_geo = new THREE.CubeGeometry( 50, 10, 100 );
foot_mat = new THREE.MeshLambertMaterial({
  color: 0xAAAAAA
});
foot_steps = []

///////////////
///////////////

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
    render();
  }, false );

  // add event for picking the location of a click on the plane
  //container.addEventListener( 'mouseup', select_footstep, false );
  container.addEventListener( 'dblclick', select_footstep, false );

  console.log('THREE scene initialized!');

  // Start the webworker
  var ww_script = "mesh_worker"
  //var ww_script = "depth_worker"
  mesh_worker = new Worker("js/"+ww_script+".js");
  mesh_worker.onmessage = function(e) {
    if(e.data=='initialized'){
      console.log('Using WebWorker '+ww_script);
      return;
    }
    //console.log(e)
    // TODO: Is this expensive, or just a cheap view change?
    var positions = new Float32Array(e.data.pos);
    var colors = new Float32Array(e.data.col);

    // debug
    console.log('processed mesh',positions);
    console.log(e.data)
    /*
    var midex = 320*(240/2)+(320/2);
    console.log('middle: '+positions[midex]+','+positions[midex+1]+','+positions[midex+2]);
    */
    update_particles( positions, colors );
    // render the particle system change
    render();
  }; //onmessage
  mesh_worker.postMessage('Start!');

  // make the particle system
  //make_particle_system();
  //make_mesh(500*480*2);

  // Begin animation
  animate();

}, false );

var render = function(){
  //console.log('whoa!')
  // render the scene using the camera
  renderer.render( scene, camera );
  stats.update();
}

var animate = function(){
  // request itself again
  //requestAnimationFrame( animate );
  controls.update();
  render();
};

// http://stackoverflow.com/questions/17044070/three-js-cast-an-picking-array
var select_footstep = function(event){
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
  var intersection = raycaster.intersectObject( foot_floor );
  // if no intersection
  //console.log(intersection)
  if(intersection.length==0){ return; }

  // record the position
  var placement = intersection[0].point;
  console.log(placement);

  // make a new footstep
  var new_footstep = new THREE.Mesh( foot_geo, foot_mat );
  scene.add(new_footstep)

  //console.log(new_footstep)
  new_footstep.position.copy(placement);
  foot_steps.push(new_footstep);

  // Render the scene now that we have updated the footsteps
  render();
  
}
// for rotation (look for theta)
//: view-source:mrdoob.github.io/three.js/examples/webgl_interactive_voxelpainter.html

var mesh_to_three = function( raw_mesh_ctx, resolution, depths, fov, name ){
  var buf = raw_mesh_ctx.getImageData(1, 1, resolution[0], resolution[1]).data.buffer;
  var obj = {}
  obj.buf = buf;
  obj.res = resolution;
  obj.dep = depths;
  obj.fov = fov;
  obj.use = name;
  console.log(obj)
  mesh_worker.postMessage(obj,[buf]);
}

var update_particles = function( positions, colors ){
  make_particle_system(positions, colors)
  /*
  particleSystem.geometry.attributes.position.array = positions;
  particleSystem.geometry.attributes[ "position" ].needsUpdate = true;
  particleSystem.geometry.computeBoundingSphere();
  */
  render();
}

// make a new mesh from the number of triangles specified
var make_mesh = function(ntriangles){

  /////////////////////
  // Initialize the faces
  var fgeometry = new THREE.BufferGeometry();
  // Dynamic, because we will do raycasting
  //fgeometry.dynamic = true;
  // Set the attribute buffers
  fgeometry.attributes = {
    index: {
      itemSize: 1,
      array: new Uint16Array( ntriangles * 3 ),
      numItems: ntriangles * 3
    },
    position: {
      itemSize: 3,
      array: new Float32Array( ntriangles * 3 * 3 ),
      numItems: ntriangles * 3 * 3
    },
    color: {
      itemSize: 3,
      array: new Float32Array( ntriangles * 3 * 3 ),
      numItems: ntriangles * 3 * 3
    }
  }
  /////////////////////

  /////////////////////
  // Initialize the indices and offsets for chunks of triangles
  // This is because you can only index by uint16, so need to overcome this
  // From the reference: "break geometry into
  // chunks of 21,845 triangles (3 unique vertices per triangle)
  // for indices to fit into 16 bit integer number
  // floor(2^16 / 3) = 21845"
  //var chunkSize = 21845;
  var chunkSize = Math.floor(2^16 / 3);
  var offsets = ntriangles / chunkSize;
  fgeometry.offsets = [];
  for ( var i = 0; i < offsets; i ++ ) {
    var offset = {
      start: i * chunkSize * 3,
      index: i * chunkSize * 3,
      count: Math.min( ntriangles - ( i * chunkSize ), chunkSize ) * 3
    };
    fgeometry.offsets.push( offset );
  }
  /////////////////////

  /////////////////////
  // Initialize the colors and positions
  var indices   = fgeometry.attributes.index.array;
  var positions = fgeometry.attributes.position.array;
  var normals   = fgeometry.attributes.normal.array;
  var colors    = fgeometry.attributes.color.array;

  for ( var i = 0; i < indices.length; i ++ ) {
    indices[ i ] = i % ( 3 * chunkSize );
  }

  var color = new THREE.Color();

  var n = 800, n2 = n/2;  // triangles spread in the cube
  var d = 12, d2 = d/2; // individual triangle size

  var pA = new THREE.Vector3();
  var pB = new THREE.Vector3();
  var pC = new THREE.Vector3();

  var cb = new THREE.Vector3();
  var ab = new THREE.Vector3();

  for ( var i = 0; i < positions.length; i += 9 ) {

    // positions

    var x = Math.random() * n - n2;
    var y = Math.random() * n - n2;
    var z = Math.random() * n - n2;

    var ax = x + Math.random() * d - d2;
    var ay = y + Math.random() * d - d2;
    var az = z + Math.random() * d - d2;

    var bx = x + Math.random() * d - d2;
    var by = y + Math.random() * d - d2;
    var bz = z + Math.random() * d - d2;

    var cx = x + Math.random() * d - d2;
    var cy = y + Math.random() * d - d2;
    var cz = z + Math.random() * d - d2;

    positions[ i ]     = ax;
    positions[ i + 1 ] = ay;
    positions[ i + 2 ] = az;

    positions[ i + 3 ] = bx;
    positions[ i + 4 ] = by;
    positions[ i + 5 ] = bz;

    positions[ i + 6 ] = cx;
    positions[ i + 7 ] = cy;
    positions[ i + 8 ] = cz;

    // flat face normals

    pA.set( ax, ay, az );
    pB.set( bx, by, bz );
    pC.set( cx, cy, cz );

    cb.subVectors( pC, pB );
    ab.subVectors( pA, pB );
    cb.cross( ab );

    cb.normalize();

    var nx = cb.x;
    var ny = cb.y;
    var nz = cb.z;

    normals[ i ]     = nx;
    normals[ i + 1 ] = ny;
    normals[ i + 2 ] = nz;

    normals[ i + 3 ] = nx;
    normals[ i + 4 ] = ny;
    normals[ i + 5 ] = nz;

    normals[ i + 6 ] = nx;
    normals[ i + 7 ] = ny;
    normals[ i + 8 ] = nz;

    // colors

    var vx = ( x / n ) + 0.5;
    var vy = ( y / n ) + 0.5;
    var vz = ( z / n ) + 0.5;

    color.setRGB( vx, vy, vz );

    colors[ i ]     = color.r;
    colors[ i + 1 ] = color.g;
    colors[ i + 2 ] = color.b;

    colors[ i + 3 ] = color.r;
    colors[ i + 4 ] = color.g;
    colors[ i + 5 ] = color.b;

    colors[ i + 6 ] = color.r;
    colors[ i + 7 ] = color.g;
    colors[ i + 8 ] = color.b;

  }
  /////////////////////
  console.log(positions,indices);
  
  /////////////////////
  // Massage the geometry to be ready for the scene
  // fgeometry.computeFaceNormals();
  // TODO: not included
  fgeometry.computeBoundingSphere();
  /////////////////////

  /////////////////////
  // Set a the initial colors (from fgeometry) and material (standard)
  var material = new THREE.MeshPhongMaterial( {
    color: 0xaaaaaa, ambient: 0xaaaaaa, specular: 0xffffff, shininess: 250,
    side: THREE.DoubleSide, vertexColors: THREE.VertexColors
  } );
  /////////////////////

  /////////////////////
  // Make the mesh from our geometry, and add it to the scene
  mesh = new THREE.Mesh( fgeometry, material );
  scene.add( mesh );
  /////////////////////
}

var make_particle_system = function(pos,col){

  scene.remove( particleSystem );

  // TODO: Ensure nparticles does not exceed 65000
  // TODO: Use the index attribute to overcome the limit
  // as documented in buffer triangles
  //var nparticles = 500*480;

  var geometry = new THREE.BufferGeometry();
  geometry.attributes = {
    position: {
      itemSize: 3,
      array: pos
    },
    color: {
      itemSize: 3,
      array: col
    }
  } // geom attr

  // default size: 1 cm
  var material = new THREE.ParticleBasicMaterial( { size: 10, vertexColors: true } );
  

  particleSystem = new THREE.ParticleSystem( geometry, material );
  scene.add( particleSystem );
}