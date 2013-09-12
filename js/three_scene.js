// Setup the THREE scene
var scene, renderer, camera, stats;
document.addEventListener( "DOMContentLoaded", function(){
  var CANVAS_WIDTH = 400, CANVAS_HEIGHT = 400;
  var container = document.getElementById( 'scene_container' );
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

// create a new mesh with
// sphere geometry - we will cover
// the sphereMaterial next!
var sphere = new THREE.Mesh(

  new THREE.SphereGeometry(
    radius,
    segments,
    rings),

  sphereMaterial);
scene.add(sphere);
///////////////
///////////////




  // fps stats
  
  stats = new Stats();

  // re-add?
  renderer = new THREE.WebGLRenderer( { antialias: false } );
  renderer.setClearColor( 0x005500, 1 );
  renderer.setSize( CANVAS_WIDTH, CANVAS_HEIGHT );
  // Add to the container
  container.appendChild( renderer.domElement );
  container.appendChild( stats.domElement );

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
}