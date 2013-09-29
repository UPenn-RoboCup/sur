// Setup the WebSocket connection and callbacks
// Form the camera image layer
var camera_img;
//var camera_ctx;
/* Handle the onload of the camera_image */
var camera_handler = function(e){
  /*
  var w = this.width;
  var h = this.height;
  var img = this;
  camera_ctx.drawImage(this, 0, 0);
  */

  // Remove the image for memory management reasons
  URL.revokeObjectURL(this.src);
  this.src = '';
}

document.addEventListener( "DOMContentLoaded", function(){
  
  // Configuration
  var ws_camera_port = 9005; // kinect
  
  // Checksum and metadata
  var fr_sz_checksum;
  var fr_metadata;

  // setup the canvas element and temporary image
  camera_img = new Image();
  // Add the image to the camera container
  camera_container.appendChild( camera_img );

  /*
  var camera_canvas = document.createElement('canvas');
  var camera_container = document.getElementById('camera_container');
  camera_canvas.setAttribute('width',camera_container.clientWidth);
  camera_canvas.setAttribute('height',camera_container.clientHeight);
  camera_ctx = camera_canvas.getContext('2d');
  camera_container.appendChild( camera_canvas );
  */

  // Connect to the websocket server
  var ws = new WebSocket('ws://' + host + ':' + ws_camera_port);
  //ws.binaryType = "arraybuffer";
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
    requestAnimationFrame( function(){
      // Put received JPEG data into the image
      camera_img.src = URL.createObjectURL( e.data );
      // Trigger processing once the image is fully loaded
      camera_img.onload = camera_handler;
    }); //animframe
  };

}, false );