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
	ws_k.binaryType = "arraybuffer"; //"blob"
	// Send data to the webworker
	ws_k.onmessage = function(e){
		console.log('Talking to the worker...')
		depth_worker.postMessage('Got a depth!');
	};
	
	// Send a message to the WebSocket server
	$('#req_btn').bind("click",function(){
	    ws_k.send('data')
	});
	
	
};
document.addEventListener( "DOMContentLoaded", ws_depth, false );