// JPEG decompressor
var URL = window.URL || window.webkitURL; // Compatibility
var d_img;
var setup_d_img = function(){
 d_img = $('#depth');
 d_img.width = 320;
 d_img.height = 240;
 d_img.alt="depth";
 d_img.onload = function(e) {
 	console.log('revoking...')
 	window.URL.revokeObjectURL(this.src);
 }
 console.log(d_img)
}

// WebWorker
var depth_worker = new Worker("js/depth_worker.js");
depth_worker.onmessage = function (oEvent) {
  console.log("Worker said : " + oEvent.data);
};
depth_worker.postMessage('Start!');

// Helper function
var get_host = function(){
	var host = window.document.location.host.replace(/:.*/, '');
	if( host.length==0 ){
		host = "localhost";
	}
	return host;
}

// Setup the WebSocket connection and callbacks
var ws_depth = function(){
	// Grab the correct host

	// Connect to the websocket server
	var ws_k = new WebSocket('ws://' + get_host() + ':9002');
	//ws_k.binaryType = "arraybuffer";
	ws_k.binaryType = "blob";
	// Send data to the webworker
	ws_k.onmessage = function(e){
		console.log('Got message from the server')
		
		// Use the size as a sort of checksum
		var d_sz = e.data.size;

		// Make the image
		var img = new Image()
		img.height = 240;
		// Put received JPEG data into the image
		img.src = URL.createObjectURL( e.data );
		img.onload = function(e) {
			// Revoke the objectURL for good memory management
			URL.revokeObjectURL(this.src);
			// Set the canvas to the pixel data of the image
			var dCanvas = document.getElementById('depth');
      dCanvas.width = 320;
      dCanvas.height = 240;
			var d_ctx = dCanvas.getContext('2d')
			d_ctx.drawImage( this, 0, 0 );
			// Send the pixel data to the worker for processing
			var depth = d_ctx.getImageData(0, 0, 320, 240).data.buffer;
			depth_worker.postMessage(depth, [depth]);
		}
	};
	
	// Send a message to the WebSocket server
	$('#req_btn').bind("click",function(){
	    ws_k.send('data')
	});
	
	
};

document.addEventListener( "DOMContentLoaded", setup_d_img, false );
document.addEventListener( "DOMContentLoaded", ws_depth, false );