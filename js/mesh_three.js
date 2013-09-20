/* THREE.js support */
var mesh_worker;
var mesh_particles;
// Add the WebWorker to make particles
document.addEventListener( "DOMContentLoaded", function(){
  /* Start the webworker */
  var ww_script = "mesh_worker"
  //var ww_script = "depth_worker"
  mesh_worker = new Worker("js/"+ww_script+".js");
  mesh_worker.onmessage = function(e) {
    if(e.data=='initialized'){
      console.log('Using WebWorker '+ww_script);
			return;
    }
    var positions = new Float32Array(e.data);
    /*
    var midex = 320*(240/2)+(320/2);
    console.log('middle: '+positions[midex]+','+positions[midex+1]+','+positions[midex+2]);
    */
    update_particles( positions );
  }; //onmessage
  mesh_worker.postMessage('Start!');

}, false );

var setup_particles = function(){
  /* initialize the particle system */
  // TODO: Ensure nparticles does not exceed 65000
  // TODO: Use the index attribute to overcome the limit
  // as documented in buffer triangles
  var nparticles = mesh_kinetic.getWidth()*mesh_kinetic.getHeight();
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
  var colors    = geometry.attributes.color.array;
  var color = new THREE.Color();
  var n = 1, n2 = n / 2; // particles spread in the cube
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
    colors[ i ]     = color.r;
    colors[ i + 1 ] = color.g;
    colors[ i + 2 ] = color.b;
  } // for init (don't really need...)

  geometry.computeBoundingSphere();
  // default size: 15
  var material = new THREE.ParticleBasicMaterial( { size: .002, vertexColors: true } ); 

  mesh_particles = new THREE.ParticleSystem( geometry, material );
  scene.add( mesh_particles );
}

var update_particles = function( positions ) {
  if(mesh_particles===undefined){
    console.log('Setting up the particles!!');
    setup_particles();
  }
  console.log('Updated teh particles');
  mesh_particles.geometry.attributes.position.array = positions;
  mesh_particles.geometry.attributes[ "position" ].needsUpdate = true;
}
