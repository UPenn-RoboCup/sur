if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;

var camera, controls, scene, renderer;

var cross;

var width  = 640;
var height = 480;
var nparticles = fr_width * fr_height;

function init_scene() {
  
  // grab our container
  container = document.getElementById( 'scene' );
  console.log('Container:',container);
  
  // create the scene
  
  scene = new THREE.Scene();
  
  // add the camera

  camera = new THREE.PerspectiveCamera( 35, width / height, 1, 10000 );
  
  
  // add the controls to look around the scene
  controls = new THREE.TrackballControls( camera );

  controls.rotateSpeed = 5.0;
  controls.panSpeed = 2000;

  controls.noZoom = true;
  controls.noPan = false;
  controls.minDistance = 1;

  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;
  controls.screen = { left: 8, top: 8, width: 640, height: 480 };


  // add light

  var dirLight = new THREE.DirectionalLight( 0xffffff );
  dirLight.position.set( 0, 0, 10 ).normalize();

  camera.add( dirLight );
  camera.add( dirLight.target );
  
  // add the camera to the scene
  
  scene.add( camera );
  camera.position.set(-1,0,0); //in millimeters
  camera.up = new THREE.Vector3(0,0,1);
  camera.lookAt(new THREE.Vector3(10000,0,0));
  
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
  var floor_sz = 10000;
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

  // stl files
  
  var stl_material = new THREE.MeshLambertMaterial(
    { color:0xdddd00, side: THREE.DoubleSide } );
  var obj_id = 0;
  var stl_objs = ['LEFT_GRIPPER','LEFT_ANKLE','FOOT'];
  var loader = new THREE.STLLoader();
  loader.load( "models/"+stl_objs[obj_id]+'.stl' );
  loader.addEventListener( 'load', function ( event ) {
    console.log(obj_id)
    var stl_geometry = event.content;
    var mesh = new THREE.Mesh( stl_geometry, stl_material );
    mesh.position.setX( 1000 );
    scene.add( mesh );
    obj_id++;
    loader.load( "models/"+stl_objs[obj_id]+'.stl' );
  } );
  
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
    
    //color.setRGB( .5, .5, .5 );

    colors[ i ]     = color.r;
    colors[ i + 1 ] = color.g;
    colors[ i + 2 ] = color.b;

  }

  geometry.computeBoundingSphere();
  // default size: 15
  var material = new THREE.ParticleBasicMaterial( { size: 5, vertexColors: true } ); 

  particleSystem = new THREE.ParticleSystem( geometry, material );
  scene.add( particleSystem );

  // renderer

  renderer = new THREE.WebGLRenderer( { antialias: false } );
  renderer.setClearColor( 0x000000, 1 );
  renderer.setSize( width, height );

  // fps stats
  
  stats = new Stats();
  //stats.domElement.style.position = 'absolute';
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

  //width = window.innerWidth - 2*40;
  //height = window.innerHeight - 2*40;

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
  // We need an update!
  console.log('update particle positions',positions);
  particleSystem.geometry.attributes.position.array = positions;
  particleSystem.geometry.attributes[ "position" ].needsUpdate = true;
}

// add document on load
document.addEventListener( "DOMContentLoaded", init_scene );