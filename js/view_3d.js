// Globally accessible variables

var container, stats;
var camera, controls, scene, renderer;
var cross;
var width, height; // TODO: rename to scene_width, scene_height
var nparticles = 500 * 480;
var clock = new THREE.Clock();
var stl_objs = ['drill'];
//var stl_objs = ['LEFT_GRIPPER','LEFT_ANKLE','FOOT', 'cordless_drill'];
//var stl_objs = ['makita'];
var tools = {};

/* This function should be globally accessible */
var update_particles = function( positions ){
  particleSystem.geometry.attributes.position.array = positions;
  particleSystem.geometry.attributes[ "position" ].needsUpdate = true;
}

// stl files
var load_stl = function(){
  var stl_material = new THREE.MeshLambertMaterial(
    { color:0xdddd00, side: THREE.DoubleSide } );
  var obj_id = 0;
  var loader = new THREE.STLLoader();
  loader.load( "models/"+stl_objs[obj_id]+'.stl' );
  loader.addEventListener( 'load', function ( event ) {
    console.log(obj_id)
    var stl_geometry = event.content;
    var mesh = new THREE.Mesh( stl_geometry, stl_material );
    // Gazebo meshes must be scaled
    // TODO: Just scale the Webots down?
    /*
    mesh.scale.x = 1000;
    mesh.scale.y = 1000;
    mesh.scale.z = 1000;
    */
    mesh.rotation.x = -Math.PI/2;
    mesh.position.setZ( -1 );
    mesh.position.setY( -.4 );
    mesh.useQuaternion = true;
    scene.add( mesh );
    var name = stl_objs[obj_id];
    tools[name] = mesh;
    obj_id++;
    if(obj_id<stl_objs.length){
      loader.load( "models/"+stl_objs[obj_id]+'.stl' );
    }
  });
}

var init_scene = function(){
  
  width  = window.innerWidth;
  height = window.innerHeight;
  
  // create the scene
  
  scene = new THREE.Scene();
  
  // add the camera

	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1e6 );
  camera.position.y = 1;
  camera.position.z = 2;
  //camera.rotation.y = Math.PI/3;
  
  var lookTarget = new THREE.Vector3(0,0,-1);
  
  // add the controls to look around the scene
  /*
	controls = new THREE.FirstPersonControls( camera );
	controls.movementSpeed = 1000;
	controls.lookSpeed = 0.125;
	controls.lookVertical = true;
	controls.constrainVertical = true;
	controls.verticalMin = 1.1;
	controls.verticalMax = 2.2;
  controls.target = lookTarget;
  */
  controls = new THREE.TrackballControls( camera );

  controls.rotateSpeed = 2.0;
  controls.panSpeed = 2.0;
  controls.zoomSpeed = 2.0;

  controls.noZoom = false;
  controls.noPan = false;
  controls.minDistance = 1;

  controls.staticMoving = false;
  controls.dynamicDampingFactor = 0.3;
  controls.keys = [ 65, 83, 68 ];
  controls.target = lookTarget;

  // add light

  var dirLight = new THREE.DirectionalLight( 0xffffff );
  dirLight.position.set( 0, 0, 10 ).normalize();

  camera.add( dirLight );
  camera.add( dirLight.target );
  
  // add the camera to the scene
  
  scene.add( camera );

  // planes for understanding where we are
  
  var alpha = Math.PI/2;
  var beta  = Math.PI/2;
  var gamma = Math.PI/2;
  var m1    = new THREE.Matrix4();
  var m2    = new THREE.Matrix4();
  var m3    = new THREE.Matrix4();
  m1.makeRotationX( alpha );
  m2.makeRotationY( beta  );
  m3.makeRotationZ( gamma );
  
  // 1 sq. meter
  var floor_sz = 10;
  var x_floor_color  = new THREE.MeshBasicMaterial( 
    { color:0xff0000, side: THREE.DoubleSide } );
  var x_floor_geom   = new THREE.PlaneGeometry(floor_sz, floor_sz, 1, 1);
  x_floor_geom.applyMatrix(m2); // rotate around y
  var x_floor        = new THREE.Mesh( x_floor_geom, x_floor_color );
  x_floor.position.x = -floor_sz/2;
  
  var y_floor_color  = new THREE.MeshBasicMaterial( 
    { color:0x00ff00, side: THREE.DoubleSide } );
  var y_floor_geom   = new THREE.PlaneGeometry(floor_sz, floor_sz, 1, 1);
  var y_floor        = new THREE.Mesh( y_floor_geom, y_floor_color );
  y_floor.applyMatrix(m1);
  y_floor.position.y = -floor_sz/2;
  
  var z_floor_color  = new THREE.MeshBasicMaterial( 
    { color:0x0000ff, side: THREE.DoubleSide } );
  var z_floor_geom   = new THREE.PlaneGeometry(floor_sz, floor_sz, 1, 1);
  var z_floor        = new THREE.Mesh( z_floor_geom, z_floor_color );
  //z_floor.applyMatrix(m3);
  z_floor.position.z = -floor_sz/2;
  
  // add the floors to the scene
  
  scene.add(x_floor);
  scene.add(y_floor);
  scene.add(z_floor);
  
  // particles from the mesh at first
  
  // TODO: Ensure nparticles does not exceed 65000
  // TODO: Use the index attribute to overcome the limit
  // as documented in buffer triangles
	var geometry = new THREE.BufferGeometry();
	geometry.attributes = {
		position: {
			itemSize: 3,
			array: new Float32Array( nparticles * 3 )
		},
		color: {
			itemSize: 3,
			array: new Float32Array( nparticles * 3 )
		}
	} // geom attr
  
  // default (random) particle positions/colors
  var positions = geometry.attributes.position.array;
  var colors = geometry.attributes.color.array;
  var color = new THREE.Color();
  var n = 1000, n2 = n / 2; // particles spread in the cube
  for ( var i = 0; i < positions.length; i += 3 ) {

    // positions

    var x = Math.random() * n - n2;
    var y = Math.random() * n - n2;
    var z = Math.random() * n - n2;

    positions[ i ]     = x;
    positions[ i + 1 ] = y;
    positions[ i + 2 ] = z;

    // colors
    
    var vx = ( x / n ) + 0.5;
    var vy = ( y / n ) + 0.5;
    var vz = ( z / n ) + 0.5;

    color.setRGB( vx, vy, vz );
    
    color.setRGB( .5, .5, .5 );

    colors[ i ]     = color.r;
    colors[ i + 1 ] = color.g;
    colors[ i + 2 ] = color.b;

  }

  geometry.computeBoundingSphere();
  // default size: 15
  var material = new THREE.ParticleBasicMaterial( { size: .002, vertexColors: true } ); 

  particleSystem = new THREE.ParticleSystem( geometry, material );
  scene.add( particleSystem );

  // renderer

  renderer = new THREE.WebGLRenderer( { antialias: false } );
  renderer.setClearColor( 0x000000, 1 );
  renderer.setSize( width, height );
  
  // fps stats
  
  stats = new Stats();
  // css is done externally

  // initial animation
  
  window.addEventListener( 'resize', function() {

    width  = window.innerWidth;
    height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( width, height );

    controls.handleResize();

  }, false );
  
  animate();
  
  // add to the HTML page
  
	container = document.createElement( 'div' );
	container.appendChild( renderer.domElement );
  container.appendChild( renderer.domElement );
  container.appendChild( stats.domElement );
  document.body.appendChild( container );
  
}

function animate() {
  requestAnimationFrame( animate );
  controls.update(clock.getDelta());
  renderer.render( scene, camera );
  stats.update();
}

// add document on load
document.addEventListener( "DOMContentLoaded", init_scene );