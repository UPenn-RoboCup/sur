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
  }
  
  // This is the intersection function
  var head_intersect = function(e){
    var event = e.gesture.touches[0];
    // if no callback, then do nothing
    if(typeof World.intersection_callback!=="function"){ return; }    
    // find the mouse position (use NDC coordinates, per documentation)
    var mouse_vector = new THREE.Vector3(
      ( event.offsetX / cam_width ) * 2 - 1,
      -( event.offsetY / cam_height ) * 2 + 1);
    var projector = new THREE.Projector();
    var raycaster = projector.pickingRay(mouse_vector,Robot.forehead_camera);
    // intersect the plane
    var intersections = raycaster.intersectObjects( World.items.concat(World.meshes) );
    // if no intersection
    //console.log(intersections)
    if(intersections.length==0){ return; }
    // only give the first intersection point
    var p = intersections[0].point;
    // get the robot point
    var r = Transform.three_to_torso(p, Robot);
    // apply the callback
    World.intersection_callback(p,r);
  }

  /*******
  * Websocket setup
  ******/
  Camera2.setup = function(){
    // put image into the dom
    camera_container = $('#camera2_container')[0];
    camera_container.appendChild( camera_img );
    // Single click looks somewhere
    var hammertime = Hammer(camera_container);
    hammertime.on("tap", head_look);
    // Clicking image selects a point or moves the camera
    clicker('gaze_cam',function(){
      is_camclick = !is_camclick;
      if(is_camclick){
        this.textContent = 'Ray';
        hammertime.on("doubletap", head_intersect);
        hammertime.off("tap", head_look);
      } else {
        this.textContent = 'Gaze';
        hammertime.off("doubletap", head_intersect);
        hammertime.on("tap", head_look);
      }
    });
    // Buttons to control streaming of the camera
    // TODO: Be able to change the rate (Combo box?)
    var stream_cam = $('#stream_cam')[0];
    clicker(stream_cam,function(){
      // Request the stream be enabled
      this.classList.remove('record');
      this.classList.add('special');
      qwest.post( rpc_url, {val:JSON.stringify([4,1,75,1])} );
    });
    clicker('single_cam',function(){
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