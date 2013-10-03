// Setup the THREE scene
var scene, renderer, camera, stats, controls;
var CANVAS_WIDTH, CANVAS_HEIGHT;
document.addEventListener( "DOMContentLoaded", function(){
  var container = document.getElementById( 'three_container' );
  CANVAS_WIDTH = container.clientWidth;
  CANVAS_HEIGHT = container.clientHeight;
  if(container===undefined){return;}

  // make the scene
  scene = new THREE.Scene();

  // add the camera
  camera = new THREE.PerspectiveCamera( 60, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1e6 );
  camera.position.z = 2;

  // add light
  var dirLight = new THREE.DirectionalLight( 0xffffff );
  dirLight.position.set( 0, 0, 10 ).normalize();
  camera.add( dirLight );
  camera.add( dirLight.target );
  camera.lookAt(new THREE.Vector3(0,0,0))
  
  // add the camera to the scene
  scene.add( camera );

  // add controls
  controls = new THREE.OrbitControls( camera );
/*
  controls.rotateSpeed = 2.0;
  controls.panSpeed = 2.0;
  controls.zoomSpeed = 2.0;
  controls.noZoom = false;
  controls.noPan = false;
  controls.minDistance = 1;
  controls.staticMoving = false;
  controls.dynamicDampingFactor = 0.3;
  controls.keys = [ 65, 83, 68 ];
  */
  //controls.target = lookTarget;
  controls.target.x = .1;

  // fps stats  
  stats = new Stats();

  // re-add?
  renderer = new THREE.WebGLRenderer( { antialias: false } );
  renderer.setClearColor( 0x005500, 1 );
  renderer.setSize( CANVAS_WIDTH, CANVAS_HEIGHT );
  // Add to the container
  container.appendChild( renderer.domElement );
  //container.appendChild( stats.domElement );

  ///////////////
///////////////
var sphereMaterial =
  new THREE.MeshLambertMaterial(
    {
      color: 0xFF0000
    });
// set up the sphere vars
var radius = 1,
    segments = 16,
    rings = 16;

var pl_width = 1, pl_height = 1;

// create a new mesh with
// sphere geometry - we will cover
// the sphereMaterial next!

var sphere = new THREE.Mesh(
new THREE.PlaneGeometry(pl_width, pl_height),
/*
  new THREE.SphereGeometry(
    radius,
    segments,
    rings),
*/
  sphereMaterial);
scene.add(sphere);

///////////////
///////////////

  // handle resizing
  window.addEventListener( 'resize', function() {
    // update the width/height
    CANVAS_WIDTH = container.clientWidth;
    CANVAS_HEIGHT = container.clientHeight;
    // update the camera view
    camera.aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    camera.updateProjectionMatrix();
    // Set the rendering size
    renderer.setSize( CANVAS_WIDTH, CANVAS_HEIGHT );
    // Fix the controls
    controls.handleResize();
  }, false );

  console.log('THREE scene initialized!');
  // Begin animation
  animate();

}, false );

var animate = function(){
  //console.log('here')
  //controls.update(clock.getDelta());
  // render the scene using the camera
  renderer.render( scene, camera );
  stats.update();
  // request itself again
  requestAnimationFrame( animate );
};