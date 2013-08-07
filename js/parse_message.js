// Configuration and globals
var mesh_port = 9002
var ww_script = "mesh_worker"
var fr_ws;
var fr_width = 480
var fr_height = 500

// Setup the WebSocket connection and callbacks
document.addEventListener( "DOMContentLoaded", function(){

	// Find the right host
	var host = window.document.location.host.replace(/:.*/, '');
	if( host.length==0 ){ host = "localhost"; }
	
	// Compatibility layer for URL
	var URL = window.URL || window.webkitURL;

	// Connect to the websocket server
	fr_ws = new WebSocket('ws://' + host + ':' + mesh_port);
	//fr_ws.binaryType = "arraybuffer";
	fr_ws.binaryType = "blob";
	
	// WebWorker
	var frame_worker = new Worker("js/"+ww_script+".js");
  frame_worker.onmessage = function(e) {
    if(e.data=='initialized'){
      console.log('WW initialized!')
    } else {
      var positions = new Float32Array(e.data);
      update_particles(positions);
    }
  };
	frame_worker.postMessage('Start!');
	
	// Checksum and metadata
	var fr_sz_checksum;
	var fr_metadata;
	
	// Send data to the webworker
	fr_ws.onmessage = function(e){
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
			console.log('Checksum fail!',fr_metadata.sz,fr_sz_checksum)
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
      var canv_sz = Math.max(fr_width,fr_height);
      i_w = (canv_sz-fr_width)/2;
      i_h = (canv_sz-fr_height)/2;
      var tmp_canvas = document.createElement('canvas');
			tmp_canvas.width  = canv_sz;
			tmp_canvas.height = canv_sz;
			var ctx = tmp_canvas.getContext('2d')
			ctx.drawImage( this, i_w, i_h );
			
			// Remove the image for memory management reasons
			URL.revokeObjectURL(this.src);
			this.src = '';
			
			// Send the pixel data to the worker for processing
			var myCanvasData = ctx.getImageData(i_w, i_h, fr_width, fr_height).data;
      frame_worker.postMessage(myCanvasData.buffer, [myCanvasData.buffer]);
      
      // After posting the data, let's rotate or something
      //var dimg = document.getElementById("tmp");
      ctx.save();
      ctx.translate( i_w+fr_width/2, i_h+fr_height/2 );
      ctx.rotate( Math.PI/2 );
      ctx.translate( -1*(i_w+fr_width/2), -1*(i_h+fr_height/2) );
      //ctx.drawImage( dimg, 0, 0 );
      // Clear the remnants of the last image
      //ctx.clearRect( 0, 0, canv_sz, canv_sz );
      ctx.restore();
      
		}
	};
}, false );