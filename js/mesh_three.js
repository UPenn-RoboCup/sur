/* THREE.js support */
var mesh_worker;
// Add the WebWorker to make particles
document.addEventListener( "DOMContentLoaded", function(){
  //var ww_script = "mesh_worker"
  var ww_script = "depth_worker"
  mesh_worker = new Worker("js/"+ww_script+".js");
  mesh_worker.onmessage = function(e) {
    if(e.data=='initialized'){
      console.log('WebWorker initialized!');
			return;
    }
    var positions = new Float32Array(e.data);
    var midex = 320*(240/2)+(320/2);
    console.log('middle: '+positions[midex]+','+positions[midex+1]+','+positions[midex+2]);
    /*
    if ( typeof update_particles!='function') {
    if ( update_particles===undefined ) { return; }
    update_particles(new Float32Array(e.data));
    */
  }; //onmessage
  mesh_worker.postMessage('Start!');
}, false );