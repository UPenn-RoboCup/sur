/*****
 * Camera2 display in the DOM
 */
(function(ctx){
  
  // Function to hold methods
  function Camera2(){}
  
  // Make the image object
  var old_imgs = []
  var camera_img = new Image();
  camera_img.id  = 'forehead_camera';
  camera_img.alt = 'No forehead_camera image yet...'
  var camera_container;
  
  // network settings for the camera
  var rpc_url = rest_root+'/m/vcm/forehead_camera/net'
  
  // Camera2 characteristics
  var h_fov = 60;
  var v_fov = 60;
  var focal_base = 640;
  var focal_length = 360;
  //
  var cam_width, cam_height, cam_mid_x, cam_mid_y;
  //
  var is_camclick = false;
  
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
    // put image into the dom
    camera_container = $('#camera2_container')[0];
    camera_container.appendChild( camera_img );
    // Buttons to control streaming of the camera
    // TODO: Be able to change the rate (Combo box?)
    var stream_cam = $('#stream_cam2')[0];
    clicker(stream_cam,function(){
      // Request the stream be enabled
      this.classList.remove('record');
      this.classList.add('special');
      qwest.post( rpc_url, {val:JSON.stringify([4,1,75,1])} );
    });
    clicker('single_cam2',function(){
      // Perform a single frame request
      stream_cam.classList.remove('special');
      stream_cam.classList.add('record');
      qwest.post( rpc_url, {val:JSON.stringify([3,1,95,1])} );
    });
    
    // Save some variables
    cam_width  = camera_container.clientWidth;
    cam_height = camera_container.clientHeight;
    cam_mid_x  = cam_width/2;
    cam_mid_y  = cam_height/2;

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
        /*
        Camera2.latency.push( e.timeStamp/1e6-fr_metadata.t );
        if(Camera2.latency.length>5){Camera2.latency.shift()}
        */
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