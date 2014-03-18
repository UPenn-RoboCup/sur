/*****
 * Camera2 display in the DOM
 */
(function(ctx){
  
  // Function to hold methods
  function Camera2(){}
  
  // Make the image object
  var old_imgs = []
  var camera_img;

Camera2.latency = [];  

  // network settings for the camera
  var rpc_url = rest_root+'/m/vcm/forehead_camera/net'
  
  Camera2.get_image = function(){
    return camera_img;
  }

  /* Handle the onload of a new camera_image */
  var camera_handler = function(e){
    // revoke the object urls for memory management
    for(var i=0,j=old_imgs.length-1;i<j;i++){
      URL.revokeObjectURL( old_imgs.shift() );
    }
  } // camera handler

  /*******
  * Websocket setup
  ******/
  Camera2.setup = function(){
    camera_img = new Image();
    camera_img.id  = 'head_camera';
    camera_img.alt = 'No head_camera image yet...' 
    
    // Websocket Configuration
    var port = 9004; // head cam
    // checksum & metadata
    var fr_sz_checksum, fr_metadata, last_camera_img;
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.binaryType = "blob";
    // Send data to the webworker
    ws.onmessage = function(e){      
      if(typeof e.data === "string"){        
        fr_metadata = JSON.parse(e.data);
				// console.log('Camera2',fr_metadata.sz);
        return;
      }
      /* Use the size as a sort of checksum
        for metadata pairing with an incoming image */
      fr_sz_checksum = e.data.size;
      if(fr_metadata.sz!==fr_sz_checksum){
        console.log('Camera2 Checksum fail!',fr_metadata.sz,fr_sz_checksum);
        return;
      }
      // Save the last received image, for delayed rendering
      last_camera_img = e.data.slice(
        0,e.data.size,'image/'+fr_metadata.c
      );

      // Perform a render
      requestAnimationFrame( function(){
        // Decompress image via browser
        camera_img.src = URL.createObjectURL(last_camera_img);
        old_imgs.push(camera_img.src);
        // Trigger processing once the image is fully loaded
        camera_img.onload = camera_handler;
      }); //animframe

    };
    		
  } // Websocket handling
	
  // export
	ctx.Camera2 = Camera2;

})(this);
