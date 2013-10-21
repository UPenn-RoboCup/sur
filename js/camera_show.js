// Setup the WebSocket connection and callbacks
var last_camera_img, camera_canvas, camera_canvas_ctx;

/* Handle the onload of a new camera_image */
var camera_handler = function(e){
  // grab important properties
  var w = this.width;
  var h = this.height;
  var img = this;

  // draw to the canvas
  camera_canvas.width = w;
  camera_canvas.height = h;
  camera_canvas_ctx.drawImage(this, 0, 0);

  // Remove the image for memory management reasons
  URL.revokeObjectURL(this.src);
  this.src = '';
}

/* Handle the page load */
document.addEventListener( "DOMContentLoaded", function(){
  
  // Configuration
  //var ws_camera_port = 9005; // kinect
  var ws_camera_port = 9003; // head camera
  
  // Checksum and metadata
  var fr_sz_checksum;
  var fr_metadata;

  // setup the canvas element and temporary image
  var camera_img  = new Image();
  camera_canvas = document.createElement('canvas');
  camera_canvas_ctx = camera_canvas.getContext('2d');
  // add the canvas
  camera_container.appendChild( camera_canvas );
  // Add the image to the camera container
  //camera_container.appendChild( camera_img );

  // Connect to the websocket server
  var ws = new WebSocket('ws://' + host + ':' + ws_camera_port);
  ws.binaryType = "blob";
  
  ws.open = function(e){
    console.log('connected!')
  }
  ws.onerror = function(e) {
    console.log('error',e)
  }
  ws.onclose = function(e) {
    console.log('close',e)
  }
	
  // Send data to the webworker
  ws.onmessage = function(e){
    if(typeof e.data === "string"){
      fr_metadata   = JSON.parse(e.data)
      var recv_time = e.timeStamp/1e6;
      var latency   = recv_time - fr_metadata.t
      //console.log('Camera Latency: '+latency*1000+'ms',fr_metadata)
      return;
    }
		
    // Use the size as a sort of checksum
    // for metadata pairing with an incoming image
    fr_sz_checksum = e.data.size;
    if(fr_metadata.sz!==fr_sz_checksum){
      console.log('Checksum fail!',fr_metadata.sz,fr_sz_checksum);
      return;
    }

    last_camera_img = e.data;
    requestAnimationFrame( function(){
      // Put received JPEG data into the image
      
      camera_img.src = URL.createObjectURL(
        last_camera_img.slice(0,last_camera_img.size,'image/'+fr_metadata.c)
      );
      // Trigger processing once the image is fully loaded
      camera_img.onload = camera_handler;
    }); //animframe
  };

}, false );