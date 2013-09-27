/* Handle the onload of the mesh_image */
var mesh_click = function(e){
  console.log(e)
  // TODO: Allow scaled image clicking for zoom feature
  var sz = mesh_kinetic.getSize();
  // Get the mouse coordinates within the image
  var offset = mesh_kinetic.getPosition();
  var u = e.clientX - offset.x;
  var v = e.clientY - offset.y;
  // Get the image value
  var ctx = mesh_kinetic.getContext();
  var pixel = ctx.getImageData(u, v, 1, 1).data;
  var w = pixel[0];
  if(w==0||w==255){return;}
  
  /* Find the world coordinates */
  var hFOV = 58*Math.PI/180;
  var vFOV = 45*Math.PI/180;
  // Convert w of 0-255 to actual meters value
  // NOTE: Should receive this in the metadata, 
  // or from mesh request itself
  var near = .5, far = 2;
  var factor = (far-near)/255;
  // Convert form millimeters to meters
  var x = factor*w+near;
  var y = Math.tan(hFOV/2)*2*(u/sz.width-.5)*x;
  var z = Math.tan(vFOV/2)*2*(.5-v/sz.height)*x;
  // World coordinates are in meters
  console.log(w+' World: '+x+','+y+','+z);
}


/* Buttons to update settings */
document.addEventListener( "DOMContentLoaded", function(){

  // request image be sent to us...
  var request_btn = document.getElementById('request_btn');
  request_btn.addEventListener('click', function() {
  	//var rpc_url = 'http://'+host+':8080/m/vcm/kinect/net_depth'
  	var rpc_url = 'http://'+host+':8080/m/vcm/chest_lidar/net'
  	var vals = [1,1,90];
    // perform the post request
  	promise.post( rpc_url, {val:JSON.stringify(vals)} ).then(function(error, text, xhr) {
      	if(error){ return; }
  	});
  }, false);

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

  // clicking on the mesh
  var mesh_container = document.getElementById('mesh_container');
  mesh_container.addEventListener("click", mesh_click, false);

}); // DOM loaded