// Setup the WebSocket connection and callbacks
// Form the camera image layer
var camera_img = new Image();
var camera_layer, camera_kinetic;
/* Handle the onload of the camera_image */
var camera_handler = function(e){
  /* Kinetic addition */
  if(camera_layer===undefined){
    camera_layer = new Kinetic.Layer({
      width:  this.width,
      height: this.height  
    });
    camera_kinetic = new Kinetic.Image({
    image: this,
    x: 30,
    y: 50,
    width:  this.width,
    height: this.height
    });
    // add the image to the layer
    camera_layer.add(camera_kinetic);
    // add the layer to the stage
    stage.add(camera_layer);
  }
  // Redraw the image
  camera_layer.draw();
  
  // Remove the image for memory management reasons
  URL.revokeObjectURL(this.src);
  this.src = '';
}

document.addEventListener( "DOMContentLoaded", function(){
  
  // Configuration
  var mesh_port = 9005
  
  // Checksum and metadata
  var fr_sz_checksum;
  var fr_metadata;

  // Connect to the websocket server
  var ws = new WebSocket('ws://' + host + ':' + mesh_port);
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