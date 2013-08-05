// Configuration and globals
var ws_port = 9002
var ww_script = "mesh_worker"
var fr_ws;
var fr_width = 480
var fr_height = 500

// Animation
var stream = 0;
var get_frame = function(){
	fr_ws.send('mesh_request');
  console.log('Requesting frame...')
	// Automatically request frames
  //stream = 1-stream;
	//if(stream==1){ requestAnimationFrame( get_frame ); }
}
document.addEventListener( "DOMContentLoaded", function(){
	$('#req_btn').bind("click",get_frame);
}, false );

// Setup the WebSocket connection and callbacks
document.addEventListener( "DOMContentLoaded", function(){

	// Find the right host
	var host = window.document.location.host.replace(/:.*/, '');
	if( host.length==0 ){ host = "localhost"; }
	
	// Compatibility layer for URL
	var URL = window.URL || window.webkitURL;

	// Connect to the websocket server
	fr_ws = new WebSocket('ws://' + host + ':' + ws_port);
	//fr_ws.binaryType = "arraybuffer";
	fr_ws.binaryType = "blob";
	
	// WebWorker
	var frame_worker = new Worker("js/"+ww_script+".js");
  frame_worker.onmessage = function(e) {
    //console.log("Worker done!");
    //console.log(e.data)
    if(e.data=='initialized'){
      console.log('WW initialized!')
    } else {
      var pixels = new Uint8Array(e.data);
      console.log(pixels)
      //update_particles(e.data);
    }
    //console.log("Done updating the particles!");
  };
	frame_worker.postMessage('Start!');
	
	// Canvas
	var myCanvas = document.getElementById('depth');
	
	// Checksum and metadata
	var fr_sz_checksum;
	var fr_metadata;
	
	// Send data to the webworker
	fr_ws.onmessage = function(e){
		//console.log(e)
		//if(e.data instanceof Blob)
		if(typeof e.data === "string"){
      fr_metadata   = JSON.parse(e.data)
      var recv_time = e.timeStamp/1e6;
      var latency   = recv_time - fr_metadata.t
			console.log('Latency: '+latency*1000+'ms')
      /*
      fr_width = fr_metadata.w
      fr_height = fr_metadata.h
      */
			return
		}
		
		// Use the size as a sort of checksum
		fr_sz_checksum = e.data.size;
		if(fr_metadata.sz!==fr_sz_checksum){
			console.log('Checksum fail!')
			return
		}

		// Make the image
		var img = new Image()
		//img.height = fr_height;
		// Put received JPEG data into the image
		img.src = URL.createObjectURL( e.data );
		
		// Trigger processing once the image is fully loaded
		img.onload = function(e) {
			
			// Set the canvas to the pixel data of the image
			myCanvas.width  = fr_width;
			myCanvas.height = fr_height;
			var myCanvasCtx = myCanvas.getContext('2d')
			myCanvasCtx.drawImage( this, 0, 0 );
			
			// Remove the image for memory management reasons
			URL.revokeObjectURL(this.src);
			this.src = '';
			
			// Send the pixel data to the worker for processing
			var myCanvasData = myCanvasCtx.getImageData(0, 0, fr_width, fr_height).data.buffer;
			frame_worker.postMessage(myCanvasData, [myCanvasData]);

		}
	};
}, false );