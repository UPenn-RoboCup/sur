/*****
 * Camera display in the DOM
 */
(function(ctx){
  
  // Function to hold methods
  function Camera(){}
  
  // Make the image object
  var old_imgs = [];
  var camera_img;
  Camera.latency = [];
  
  // network settings for the camera
  var rpc_url = rest_root+'/m/vcm/head_camera/net'
  
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
  
  Camera.get_image = function(){
    return camera_img;
  }
  
  Camera.setup = function(){

    camera_img = new Image();
    camera_img.id  = 'head_camera';
    camera_img.alt = 'No head_camera image yet...'

    // Websocket Configuration
    //var mesh_port = 9005; // kinect
    var port = 9003; // head cam
    // checksum & metadata
    var fr_sz_checksum, fr_metadata, last_camera_img;
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.binaryType = "blob";
    // Send data to the webworker
    ws.onmessage = function(e){
      if(typeof e.data === "string"){
        fr_metadata = JSON.parse(e.data);
        var latency = (e.timeStamp/1e3-time_offset) - fr_metadata.t;
        Camera.latency.push( latency );
        if(Camera.latency.length>5){Camera.latency.shift()}
        console.log('Camera',fr_metadata.sz,Camera.latency);
        return;
      }
      /* Use the size as a sort of checksum
        for metadata pairing with an incoming image */
      fr_sz_checksum = e.data.size;
      if(fr_metadata.sz!==fr_sz_checksum){
        console.log('Camera Checksum fail!',fr_metadata.sz,fr_sz_checksum);
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
	ctx.Camera = Camera;

})(this);