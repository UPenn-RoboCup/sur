if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;

var camera, controls, scene, renderer;

var cross;

var width, height;
width = 600;
height = 400;

function init_scene() {
  
  // grab our container
  container = document.getElementById( 'scene' );
  
  // create the scene
  
  scene = new THREE.Scene();
  
  /*
  width = window.innerWidth;
  height = window.innerHeight;
  */
  
  // add the camera

  camera = new THREE.PerspectiveCamera( 60, width / height, 0.01, 1e10 );
  camera.position.x = 50;
  camera.position.y = 10;
  camera.position.z = -500; // in millimeters
  
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
  var x_floor_color = new THREE.MeshBasicMaterial( { color:0xff0000, side: THREE.DoubleSide } );
  var x_floor_geom = new THREE.PlaneGeometry(1000, 1000, 10, 10)
  x_floor_geom.applyMatrix(m2); // rotate around y
  var x_floor = new THREE.Mesh( x_floor_geom, x_floor_color );
  x_floor.position.x = 500;
  
  var y_floor_color = new THREE.MeshBasicMaterial( { color:0x00ff00, side: THREE.DoubleSide } );
  var y_floor_geom = new THREE.PlaneGeometry(1000, 1000, 10, 10)
  var y_floor = new THREE.Mesh( y_floor_geom, y_floor_color );
  y_floor.applyMatrix(m1);
  y_floor.position.y = -500;
  
  var z_floor_color = new THREE.MeshBasicMaterial( { color:0x0000ff, side: THREE.DoubleSide } );
  var z_floor_geom = new THREE.PlaneGeometry(1000, 1000, 10, 10)
  var z_floor = new THREE.Mesh( z_floor_geom, z_floor_color );
  //z_floor.applyMatrix(m3);
  z_floor.position.z = 500;
  
  // add the floors to the scene
  
  scene.add(x_floor);
  scene.add(y_floor);
  scene.add(z_floor);

  // stl files
  
  var material = new THREE.MeshLambertMaterial( { color:0xffffff, side: THREE.DoubleSide } );

  var loader = new THREE.STLLoader();
  loader.addEventListener( 'load', function ( event ) {

    var geometry = event.content;

    var mesh = new THREE.Mesh( geometry, material );
    mesh.position.setY( - 0.09 );
    scene.add( mesh );

  } );
  loader.load( "models/LEFT_ARM.stl" );
  loader.load( "models/LEFT_ELBOW.stl" );
  loader.load( "models/LEFT_GRIPPER.stl" );

  // renderer

  renderer = new THREE.WebGLRenderer( { antialias: false } );
  renderer.setClearColor( 0x000000, 1 );
  renderer.setSize( width, height );

  // fps stats
  
  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  
  // add to the HTML page
  
  container.appendChild( renderer.domElement );
  container.appendChild( stats.domElement );

  //

  window.addEventListener( 'resize', onWindowResize, false );

  // initial animation
  
  animate();
  
}

function onWindowResize() {

  /*
  width = window.innerWidth;
  height = window.innerHeight;
  */

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

// add document on load
document.addEventListener( "DOMContentLoaded", init_scene );