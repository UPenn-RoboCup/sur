// Setup the WebSocket connection and callbacks
document.addEventListener( "DOMContentLoaded", function(){
  
  // Configuration
  var mesh_port = 9001
  
  // Checksum and metadata
  var fr_sz_checksum;
  var fr_metadata;

  // Connect to the websocket server
  var fr_ws = new WebSocket('ws://' + host + ':' + mesh_port);
  //fr_ws.binaryType = "arraybuffer";
  fr_ws.binaryType = "blob";
  
  fr_ws.open = function(e){
    console.log('connected!')
  }
  fr_ws.onerror = function(e) {
    console.log('error',e)
  }
  fr_ws.onclose = function(e) {
    console.log('close',e)
  }
	
  // Send data to the webworker
  fr_ws.onmessage = function(e){
    if(typeof e.data === "string"){
      fr_metadata   = JSON.parse(e.data)
      var recv_time = e.timeStamp/1e6;
      var latency   = recv_time - fr_metadata.t
      console.log('Mesh Latency: '+latency*1000+'ms')
      fr_width  = fr_metadata.res[1]
      fr_height = fr_metadata.res[0]
      console.log(fr_metadata)
      return
    }
		
    // Use the size as a sort of checksum
    fr_sz_checksum = e.data.size;
    if(fr_metadata.sz!==fr_sz_checksum){
      console.log('Checksum fail!',fr_metadata.sz,fr_sz_checksum);
      return;
    }

    // Make the image
    var img = new Image();
    //img.height = fr_height;
    // Put received JPEG data into the image
    img.src = URL.createObjectURL( e.data );

    // Trigger processing once the image is fully loaded
    img.onload = function(e) {

      // Set the canvas to the pixel data of the image
      var tmp_canvas    = document.createElement('canvas');
      tmp_canvas.width  = fr_width;
      tmp_canvas.height = fr_height;
      var ctx = tmp_canvas.getContext('2d')
      ctx.drawImage( this, 0, 0 );
			
      // Remove the image for memory management reasons
      URL.revokeObjectURL(this.src);
      this.src = '';
			
      // Send the pixel data to the worker for processing
      var myCanvasData = ctx.getImageData(0, 0, fr_width, fr_height).data;
      frame_worker.postMessage(myCanvasData.buffer, [myCanvasData.buffer]);
      
      // After posting the data, let's rotate or something
      var dcanvas = $("#depthmap")[0];
      dcanvas.width = fr_height;
      dcanvas.height = fr_width;
      var dcanv_ctx = dcanvas.getContext('2d');
      dcanv_ctx.save();
      dcanv_ctx.translate( fr_width/2, -fr_height/2 );
      dcanv_ctx.scale(-1, 1);
      dcanv_ctx.rotate( Math.PI/2 );
      dcanv_ctx.drawImage( tmp_canvas, fr_height/2, -fr_width/2 );
      dcanv_ctx.restore();
    }
  };
}, false );

document.addEventListener( "DOMContentLoaded", function(){
  var ww_script = "mesh_worker"
  // WebWorker
  var frame_worker = new Worker("js/"+ww_script+".js");
  frame_worker.onmessage = function(e) {
    if(e.data=='initialized'){
      console.log('WebWorker initialized!');
			return;
    }
    if ( typeof update_particles!='function') {
			console.log('No particle update available');
			return;
		}
    var positions = new Float32Array(e.data);
    update_particles(positions);
  };
  frame_worker.postMessage('Start!');
}, false );
