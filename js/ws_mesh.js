// Setup the WebSocket connection and callbacks
var mesh_img = new Image();
var mesh_layer = new Kinetic.Layer();
var mesh_kinetic;
/* Handle the onload of the mesh_image */
var mesh_handler = function(e){
  /* Kinetic addition */
  if(mesh_kinetic===undefined){
    mesh_kinetic = new Kinetic.Image({
    image: this,
    //x: 30,
    //y: 50,
    width:  this.width,
    height: this.height
    });
    // add the image to the layer
    mesh_layer.add(mesh_kinetic);
    // add the layer to the stage
    stage.add(mesh_layer);
    // add click handling for this image
    if(mesh_click!==undefined){
      mesh_kinetic.on('click', mesh_click);
    }
  } else {
    // Below is for rotation of the chest_mesh!
    /*
    mesh_kinetic.setRotationDeg(90);
    mesh_kinetic.setPosition(this.height, 0);
    */
    // Redraw the image
    mesh_layer.draw();
  }
  
  // Remove the image for memory management reasons
  URL.revokeObjectURL(this.src);
  this.src = '';
}

document.addEventListener( "DOMContentLoaded", function(){
  
  // Configuration
  var mesh_port = 9001 // mesh
  //var mesh_port = 9002 //kinect
  
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