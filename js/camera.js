/*****
 * Camera display in the DOM
 */
(function(ctx){
  
  // Function to hold methods
  function Camera(){}
  
  // Make the image object
  var old_imgs = []
  var camera_img = new Image();
  camera_img.id = 'head_camera';
  camera_img.alt = 'No head_camera image yet...'
  var camera_container;
  
  // Camera characteristics
  var h_fov = 60;
  var v_fov = 60;
  var focal_base = 320;
  var focal_length = 180;
  //
  var cam_width, cam_height, cam_mid_x, cam_mid_y;
  
  /* Handle the onload of a new camera_image */
  var camera_handler = function(e){
    // revoke the object urls for memory management
    for(var i=0,j=old_imgs.length-1;i<j;i++){
      URL.revokeObjectURL( old_imgs.shift() );
    }
  } // camera handler
  
  var head_look = function(e){
    var event = e.gesture.touches[0];
    var ang_url = rest_root+'/m/hcm/motion/headangle';
    // Adjust the angle based on the previous angle from the robot
    qwest.get(ang_url).success(function(cur_headangle){
      //console.log('Current desired angle',cur_headangle);
      var x = (event.offsetX-cam_mid_x)/cam_width  * h_fov * DEG_TO_RAD;
      var y = (event.offsetY-cam_mid_y)/cam_height * v_fov * DEG_TO_RAD;
      x+=cur_headangle[0];
      y+=cur_headangle[1];
      //console.log('New Angle',x,y);
      // send to the robot
      qwest.post(ang_url,{val: JSON.stringify([x,y])});
    });
    
    /*
    var pan  = Math.atan2( focal_length, e.offsetX-cam_mid_x ) * RAD_TO_DEG;
    var tilt = Math.atan2( focal_length, e.offsetY-cam_mid_y ) * RAD_TO_DEG;
    console.log(pan,tilt);
    */
  }
  
  var camera_click_toggle = function(){
    
  }
  
  /*******
  * Websocket setup
  ******/
  Camera.setup = function(){
    // put image into the dom
    camera_container = $('#camera_container')[0];
    camera_container.appendChild( camera_img );
    // Single click looks somewhere
    var hammertime = Hammer(camera_container);
    hammertime.on("tap", head_look);
    // click image selects a point or moves the camera
    clicker('cam_clicks_btn',function(){
      console.log('camclick',this)
      hammertime.off("tap", head_look);
      hammertime.on("doubletap", head_look);
    })
    
    // Save some variables
    cam_width  = camera_container.clientWidth;
    cam_height = camera_container.clientHeight;
    cam_mid_x  = cam_width/2;
    cam_mid_y  = cam_height/2;

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
        /*
        Camera.latency.push( e.timeStamp/1e6-fr_metadata.t );
        if(Camera.latency.length>5){Camera.latency.shift()}
        */
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