// Setup the WebSocket connection and callbacks
var mesh_img = new Image();
//var mesh_width, mesh_height;
document.addEventListener( "DOMContentLoaded", function(){
  
  // Configuration
  var mesh_port = 9002
  
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
      //console.log('Mesh Latency: '+latency*1000+'ms',fr_metadata)
      return;
    }
		
    // Use the size as a sort of checksum
    // for metadata pairing with an incoming image
    fr_sz_checksum = e.data.size;
    if(fr_metadata.sz!==fr_sz_checksum){
      console.log('Checksum fail!',fr_metadata.sz,fr_sz_checksum);
      return;
    }

    if( mesh_handler !== undefined ) {
      requestAnimationFrame( function(){
        // Put received JPEG data into the image
        mesh_img.src = URL.createObjectURL( e.data );
        // Trigger processing once the image is fully loaded
        mesh_img.onload = mesh_handler;
      }); //animframe
    } // if a mesh handler is available
  };

}, false );