/* THREE.js support */
var mesh_worker;
// Add the WebWorker to make particles
document.addEventListener( "DOMContentLoaded", function(){
  var ww_script = "mesh_worker"
  var mesh_worker = new Worker("js/"+ww_script+".js");
  mesh_worker.onmessage = function(e) {
    if(e.data=='initialized'){
      console.log('WebWorker initialized!');
			return;
    }
    if ( update_particles===undefined ) {
			console.log('No particle update available');
			return;
		}
    var positions = new Float32Array(e.data);
    update_particles(positions);
  };
  mesh_worker.postMessage('Start!');
}, false );