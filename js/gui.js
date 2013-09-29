
/* Buttons to update settings */
document.addEventListener( "DOMContentLoaded", function(){

  // update the dipole in the three scene
  var update_btn = document.getElementById('update_btn');
  update_btn.addEventListener('click', function() {
    //if(error){ console.log('UPDATE ERROR '+error); return; }
  	// if not in the scene, then add it
  	var ctx = mesh_kinetic.getContext();
  	var buf = ctx.getImageData(1, 1, mesh_kinetic.getWidth(), mesh_kinetic.getHeight()).data.buffer;
    // http://tech.pusherhq.com/demo/raytracer_workers
  	mesh_worker.postMessage({buf: buf, res: [500,400]}, [buf]);

  }, false);

  

}); // DOM loaded