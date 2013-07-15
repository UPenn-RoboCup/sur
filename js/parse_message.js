// Configuration
var ws_port = 9002
var ww_script = "depth_worker"
var fr_width = 320
var fr_height = 240
var fr_id = 'depth'
var fr_fps = 2

/* Global Variables */
// Checksum to identify the right frame
var fr_sz_checksum;
var fr_metadata;

// Websocket
var ws_k;
var stream = 0;
// Assume animation frames come in at 60 fps
var skip_cnt = Math.floor(60 / fr_fps);
var nskips = 0;
var get_frame = function(){
	nskips = nskips + 1
	if(nskips==skip_cnt){
		ws_k.send('data')
		nskips = 0;
	}
	// Automatically request frames
	if(stream==1){
		requestAnimationFrame( get_frame );
	}
}
document.addEventListener( "DOMContentLoaded", function(){
	$('#req_btn').bind("click",function(){
		// Toggle Streaming
		stream = 1-stream
		get_frame()
	});
}, false );

// Setup the WebSocket connection and callbacks
document.addEventListener( "DOMContentLoaded", function(){

	// Find the right host
	var host = window.document.location.host.replace(/:.*/, '');
	if( host.length==0 ){
		host = "localhost";
	}
	
	// Compatibility layer for URL
	var URL = window.URL || window.webkitURL;

	// Connect to the websocket server
	ws_k = new WebSocket('ws://' + host + ':' + ws_port);
	//ws_k.binaryType = "arraybuffer";
	ws_k.binaryType = "blob";
	
	// WebWorker
	var frame_worker = new Worker("js/"+ww_script+".js");
	frame_worker.onmessage = function(oEvent) {
		//console.log("Worker said : " + oEvent.data);
	};
	frame_worker.postMessage('Start!');
	
	// Canvas
	var myCanvas = document.getElementById('depth');
	
	// Send data to the webworker
	ws_k.onmessage = function(e){
		//console.log(e)
		//if(e.data instanceof Blob)
		if(typeof e.data === "string"){
			fr_metadata = JSON.parse(e.data)
			var recv_time = e.timeStamp/1e6;
			var latency = recv_time - fr_metadata.t
			//console.log('Latency: '+latency*1000+'ms')
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
		img.height = fr_height;
		// Put received JPEG data into the image
		img.src = URL.createObjectURL( e.data );
		img.onload = function(e) {
			// Revoke the objectURL for good memory management
			URL.revokeObjectURL(this.src);
			// Set the canvas to the pixel data of the image
			//var myCanvas = document.getElementById('depth');
			myCanvas.width = fr_width;
			myCanvas.height = fr_height;
			var myCanvasCtx = myCanvas.getContext('2d')
			myCanvasCtx.drawImage( this, 0, 0 );
			// Send the pixel data to the worker for processing
			var myCanvasData = myCanvasCtx.getImageData(0, 0, fr_width, fr_height).data.buffer;
			frame_worker.postMessage(myCanvasData, [myCanvasData]);
		}
	};
}, false );