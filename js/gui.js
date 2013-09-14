/* Buttons to update settings */
document.addEventListener( "DOMContentLoaded", function(){

// Find the buttons in the DOM
var request_btn = $('a#request')[0];
var update_btn = $('a#update')[0];

// request image be sent to us...
request_btn.addEventListener('click', function() {
	var rpc_url = 'http://'+host+':8080/m/vcm/kinect/net_depth'
	var vals = [1,1,90];
  // perform the post request
	promise.post( rpc_url, {val:JSON.stringify(vals)} ).then(function(error, text, xhr) {
    if(error){ return; }
	});
}, false);

// update the dipole in the three scene
update_btn.addEventListener('click', function() {
  if(error){ console.log('UPDATE ERROR '+error); return; }
	// if not in the scene, then add it
	var ctx = mesh_kinetic.getContext();
	var buf = ctx.getImageData(1, 1, mesh_kinetic.getWidth(), mesh_kinetic.getHeight()).data.buffer;
	mesh_worker.postMessage(buf, [buf]);

}, false);

}); // DOM loaded
