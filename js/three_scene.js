// Setup the THREE scene
var scene, renderer, camera, stats, controls;
// special objects
var foot_floor, foot_steps, foot_geo, foot_mat;
// particle system and mesh
var particleSystem, mesh;
var CANVAS_WIDTH, CANVAS_HEIGHT;
document.addEventListener( "DOMContentLoaded", function(){
  var container = document.getElementById( 'three_container' );
  if(container===undefined){return;}
  CANVAS_WIDTH = container.clientWidth;
  CANVAS_HEIGHT = container.clientHeight;

  // Look at things!
  var lookTarget = new THREE.Vector3(0,1000,1000);

  // add the camera
  camera = new THREE.PerspectiveCamera( 60, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1e6 );
  // add the camera to the scene
  camera.position.z = 0;
  camera.position.y = bodyHeight*1000;

  // add controls
  controls = new THREE.OrbitControls( camera, container );
  controls.addEventListener( 'change', render );
  //controls.center = new THREE.Vector3(0,0,1000);
  controls.target = lookTarget;// look in front one meter
  //controls.addEventListener('change',function(){requestAnimationFrame( animate )});

  // make the scene
  scene = new THREE.Scene();

  // add light to the scene
  var dirLight = new THREE.DirectionalLight( 0xffffff );
  dirLight.position.set( 0, 1000, 0 ).normalize();
  scene.add( dirLight );

  // ground light
  var light = new THREE.PointLight( 0xffffff, 1, 10000 );
  light.position.set( 0, 0, 0 );
  scene.add( light );

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
  var floor_material = new THREE.MeshPhongMaterial({
    ambient: 0x555555, specular: 0x111111, shininess: 200,
    side: THREE.DoubleSide,
    color: 0xAAAAAA,
    //vertexColors: THREE.VertexColors,
    //wireframe: true,
  });
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
new THREE.PlaneGeometry(pl_width, pl_height),floor_material);
foot_floor.material.side = THREE.DoubleSide;
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
  color: 0xFFAAAA
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
    console.log(e)
    
    // TODO: Is this expensive, or just a cheap view change?
    var positions = new Float32Array(e.data.pos);
    var colors    = new Float32Array(e.data.col);
    var index     = new Uint16Array(e.data.idx);

    //make_particle_system(positions, colors);
    make_mesh(index,positions,e.data.n_quad,e.data.n_el /*,colors*/ );

    // debug
    console.log(e.data);

    // render the particle system change
    render();
  }; //onmessage
  mesh_worker.postMessage('Start!');

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
  var intersection = raycaster.intersectObjects( [foot_floor,mesh] );
  // if no intersection
  //console.log(intersection)
  if(intersection.length==0){ return; }

  // record the position
  var placement = intersection[0].point;
  //console.log(placement);

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
  obj.pitch = 10*Math.PI/180;
  //console.log(obj);
  mesh_worker.postMessage(obj,[buf]);
}

// make a new mesh from the number of triangles specified
//var make_mesh = function(index,position,n_quad,n_el,c2){
 var make_mesh = function(index,position,n_quad,n_el){
   console.log(index);
  scene.remove( mesh );
  /////////////////////
  // Initialize the faces
  var geometry = new THREE.BufferGeometry();
  // Dynamic, because we will do raycasting
  geometry.dynamic = true;
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
    /*
    color: {
      itemSize: 3,
      array: c2,
    },
    */
  }
  /////////////////////
  // form the offsets
  //var chunkSize = 2^16;
  var chunkSize = 65536;
  var offsets = n_el / chunkSize;
  console.log('chunky',n_el,chunkSize,offsets)
  geometry.offsets = [];
  for ( var i = 0; i < offsets; i ++ ) {
    var offset = {
      //start: i * chunkSize * (12 / 8) * 3, // 12 tri from 8 vert
      start: i * chunkSize * (2 / 4) * 3,
      index: i * chunkSize,
      count: Math.min( 2*n_quad - ( i * chunkSize * (2 / 4) ), chunkSize * (2 / 4) ) * 3
    };
    geometry.offsets.push( offset );
  }
  console.log(geometry.offsets);
  /////////////////////
  geometry.computeBoundingSphere(); // for picking via raycasting

  /////////////////////
  // Phong Material requires normals for reflectivity
  geometry.computeVertexNormals()
  var material = new THREE.MeshPhongMaterial({
    ambient: 0x555555, specular: 0x111111, shininess: 200,
    side: THREE.DoubleSide,
    color: 0xCCCCCC,
    //vertexColors: THREE.VertexColors,
    //wireframe: true,
  });
  /////////////////////

  /////////////////////
  // Make the mesh from our geometry, and add it to the scene
  mesh = new THREE.Mesh( geometry, material );
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