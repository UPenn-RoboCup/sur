// Setup the THREE scene
var scene, renderer, camera, stats, controls;
// special objects
var foot_floor, foot_steps, foot_geo, foot_mat;
// particle system and mesh
var particleSystem, mesh;
//
var CANVAS_WIDTH, CANVAS_HEIGHT;

var add_mesh_buttons = function(){
  
  document.getElementById('clear_wp_btn').addEventListener('click', function() {
  
    for(var i=0;i<foot_steps.length;i++){scene.remove(foot_steps[i]);}
    foot_steps = [];
  
    d3.select("#wp_status").selectAll("p")
    .data(foot_steps).exit().remove();
    
    render();
    
  }, false);
}


document.addEventListener( "DOMContentLoaded", function(){
  var container = document.getElementById( 'three_container' );
  if(container===undefined){return;}
  CANVAS_WIDTH = container.clientWidth;
  CANVAS_HEIGHT = container.clientHeight;

  // Add the buttons
  add_mesh_buttons();
  // double clicking the scene
  // add event for picking the location of a click on the plane
  container.addEventListener( 'dblclick', select_footstep, false );

  // Look at things!
  var lookTarget = new THREE.Vector3(0,1000,1000);

  // add the camera
  camera = new THREE.PerspectiveCamera( 60, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1e6 );
  // add the camera to the scene
  camera.position.z = 0;
  camera.position.y = bodyHeight*2000;

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
    
    // debug
    //console.log(e)
    //console.log(e.data);
    
    var position = new Float32Array(e.data.pos,0,3*e.data.n_el);
    var color    = new Float32Array(e.data.col,0,3*e.data.n_el);
    var index    = new Uint16Array(e.data.idx,0,6*e.data.n_quad);
    var offset   = e.data.quad_offsets;    

    make_mesh(index,position,color,offset);
    //make_particle_system(position, color);

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

  // Save the footstep
  new_footstep.position.copy(placement);
  var pos = new_footstep.position;
  new_footstep.robot_frame = new THREE.Vector3(pos.z/1000,pos.x/1000,pos.y/1000);
  foot_steps.push(new_footstep);

  // Log all points in our debug zone
  d3.select("#wp_status").selectAll("p")
    .data(foot_steps)
    .enter()
    .append("p")
    .text(function(d) {
      var pos = d.robot_frame;
      return sprintf('%.2f, %.2f, %.2f',pos.x,pos.y,pos.z);
    });
  

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
  obj.pitch = 12*Math.PI/180;
  //console.log(obj);
  mesh_worker.postMessage(obj,[buf]);
}

// BufferGeometry of the mesh
var make_mesh = function(index,position,color,offsets){
  scene.remove( mesh );
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

// Update the particle system
var make_particle_system = function(position,color){
  scene.remove( particleSystem );
  var geometry = new THREE.BufferGeometry();
  // Dynamic, because we will do raycasting? just for mesh
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
  var material = new THREE.ParticleBasicMaterial( { size: 5, vertexColors: true } );
  particleSystem = new THREE.ParticleSystem( geometry, material );
  scene.add( particleSystem );
}