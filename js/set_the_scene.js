if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;

var camera, controls, scene, renderer;

var cross;

var width, height;
width = 600;
height = 400;
var nparticles = fr_width * fr_height;

function init_scene() {
  
  // grab our container
  container = document.getElementById( 'scene' );
  
  // create the scene
  
  scene = new THREE.Scene();
  
  width = window.innerWidth - 2*40;
  height = window.innerHeight - 2*40;
  
  // add the camera

  camera = new THREE.PerspectiveCamera( 60, width / height, 0.01, 1e10 );
  camera.position.x = -1000;
  camera.position.y = 1000;
  camera.position.z = -1000; // in millimeters
  
  // add the controls to look around the scene

  controls = new THREE.TrackballControls( camera );

  controls.rotateSpeed = 5.0;
  controls.zoomSpeed = 5;
  controls.panSpeed = 2;

  controls.noZoom = false;
  controls.noPan = false;

  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;

  

  // add light

  var dirLight = new THREE.DirectionalLight( 0xffffff );
  dirLight.position.set( 2000, 2000, 1000 ).normalize();

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
  var x_floor_color  = new THREE.MeshBasicMaterial( 
    { color:0xff0000, side: THREE.DoubleSide } );
  var x_floor_geom   = new THREE.PlaneGeometry(1000, 1000, 10, 10)
  x_floor_geom.applyMatrix(m2); // rotate around y
  var x_floor        = new THREE.Mesh( x_floor_geom, x_floor_color );
  x_floor.position.x = 500;
  
  var y_floor_color  = new THREE.MeshBasicMaterial( 
    { color:0x00ff00, side: THREE.DoubleSide } );
  var y_floor_geom   = new THREE.PlaneGeometry(1000, 1000, 10, 10)
  var y_floor        = new THREE.Mesh( y_floor_geom, y_floor_color );
  y_floor.applyMatrix(m1);
  y_floor.position.y = -500;
  
  var z_floor_color  = new THREE.MeshBasicMaterial( 
    { color:0x0000ff, side: THREE.DoubleSide } );
  var z_floor_geom   = new THREE.PlaneGeometry(1000, 1000, 10, 10)
  var z_floor        = new THREE.Mesh( z_floor_geom, z_floor_color );
  //z_floor.applyMatrix(m3);
  z_floor.position.z = 500;
  
  // add the floors to the scene
  
  scene.add(x_floor);
  scene.add(y_floor);
  scene.add(z_floor);

  // stl files
  /*
  var stl_material = new THREE.MeshLambertMaterial( { color:0xffffff, side: THREE.DoubleSide } );

  var loader = new THREE.STLLoader();
  loader.addEventListener( 'load', function ( event ) {

    var stl_geometry = event.content;

    var mesh = new THREE.Mesh( stl_geometry, stl_material );
    mesh.position.setY( - 0.09 );
    scene.add( mesh );

  } );
  loader.load( "models/LEFT_ARM.stl" );
  loader.load( "models/LEFT_ELBOW.stl" );
  loader.load( "models/LEFT_GRIPPER.stl" );
  
  */
  
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
    /*
    var vx = ( x / n ) + 0.5;
    var vy = ( y / n ) + 0.5;
    var vz = ( z / n ) + 0.5;

    color.setRGB( vx, vy, vz );
    */
    color.setRGB( .5, .5, .5 );

    colors[ i ]     = color.r;
    colors[ i + 1 ] = color.g;
    colors[ i + 2 ] = color.b;

  }

  geometry.computeBoundingSphere();
  // default size: 15
  var material = new THREE.ParticleBasicMaterial( { size: 2, vertexColors: true } ); 

  particleSystem = new THREE.ParticleSystem( geometry, material );
  scene.add( particleSystem );

  // renderer

  renderer = new THREE.WebGLRenderer( { antialias: false } );
  renderer.setClearColor( 0x000000, 1 );
  renderer.setSize( width, height );

  // fps stats
  
  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '40px';
  
  // add to the HTML page
  
  container.appendChild( renderer.domElement );
  container.appendChild( stats.domElement );

  //

  window.addEventListener( 'resize', onWindowResize, false );

  // initial animation
  
  animate();
  
}

function onWindowResize() {

  width = window.innerWidth - 2*40;
  height = window.innerHeight - 2*40;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize( width, height );

  controls.handleResize();

}

function animate() {

  requestAnimationFrame( animate );

  controls.update();
  renderer.render( scene, camera );

  stats.update();

}

function update_particles(positions){
  console.log('Updating particles from mesh!')
  /*
  console.log(data)
  console.log(data[1])
  var data_idx = 0;
  var positions = new Float32Array( nparticles * 3 )
  for ( var i = 0; i < positions.length; i += 3 ) {
    positions[ i ]     = 1000*data[data_idx];
    positions[ i + 1 ] = 1000*data[data_idx+1];
    positions[ i + 2 ] = 1000*data[data_idx+2];
    // data is from the rgba, converted to xyza, with a not used: color?
    data_idx+=4;
  }
  */
  // We need an update!
  console.log(positions);
  particleSystem.geometry.attributes.position.array = positions;
  particleSystem.geometry.attributes[ "position" ].needsUpdate = true;
}

// add document on load
document.addEventListener( "DOMContentLoaded", init_scene );