/*****
 * 3D World for the robot scene
 */
(function(ctx){
  
  // Function to hold methods
  function Camera(){}
  
  // Double buffering?
  var camera_img, last_camera_img, prev_img_src;
  
  /* Handle the onload of a new camera_image */
  var camera_handler = function(e){
    /*
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
    */
    URL.revokeObjectURL(prev_img_src);
  }
  
  
  /*******
  * Websocket setup
  ******/
  Camera.setup = function(){
    
    // Grab the DOM element, since... why not?
    camera_img = new Image();
    /*
    camera_canvas = document.createElement('canvas');
    camera_canvas_ctx = camera_canvas.getContext('2d');
    // add the canvas
    camera_container.appendChild( camera_canvas );
    */
    
    // Websocket Configuration
    //var mesh_port = 9005; // kinect
    var port = 9003; // head cam
    
    // checksum & metadata
    var fr_sz_checksum, fr_metadata;
    
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.binaryType = "blob";

    // Send data to the webworker
    ws.onmessage = function(e){
      if(typeof e.data === "string"){
        fr_metadata    = JSON.parse(e.data);
        Camera.latency.push( e.timeStamp/1e6-fr_metadata.t );
        if(Camera.latency.length>5){Camera.latency.shift()}
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
      last_camera_img = e.data;
      requestAnimationFrame( function(){
        prev_img_src = camera_img.src;
        // Decompress image via browser
        camera_img.src = URL.createObjectURL(
          last_camera_img.slice(0,last_camera_img.size,'image/'+fr_metadata.c);
        );
        // Trigger processing once the image is fully loaded
        camera_img.onload = camera_handler;
      }); //animframe
    };
  } // Websocket handling

  // export
	ctx.Camera = Camera;

})(this);