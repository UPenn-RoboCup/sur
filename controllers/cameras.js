// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  // Set up the camera
  Camera.setup();
  
  // Place on the page
  var camera_container = $('#camera_container')[0];
  var img = Camera.get_image()
  camera_container.appendChild( img );
  
  // Head look
  var h_fov = 60;
  var v_fov = 60;
  var ang_url = rest_root+'/m/hcm/motion/headangle';
  var head_look = function(e){
    var event = e.gesture.touches[0];
    
    var width = camera_container.clientWidth;
    var height = camera_container.clientHeight;
    // Adjust the angle based on the previous angle from the robot
    qwest.get(ang_url).success(function(cur_headangle){
      var dx = event.offsetX || event.clientX;
      var dy = event.offsetX || event.clientY;
      var x = (0.5 - dx/width ) * h_fov * DEG_TO_RAD;
      var y = (dy/height - 0.5) * v_fov * DEG_TO_RAD;
      //console.log('Current desired angle',cur_headangle,x,y);
      x += cur_headangle[0];
      y += cur_headangle[1];
      if(x==null||x===undefined||y==null||y===undefined){return;}
      console.log('Current desired angle',cur_headangle,x,y);
      qwest.post(ang_url,{val: JSON.stringify([x,y])});
    });
  }
  
  // Single click looks somewhere
  var hammertime = Hammer(camera_container);
  hammertime.on("tap", head_look);
  
  /*
  // This is the intersection function
  var head_intersect = function(e){
    var event = e.gesture.touches[0];
    // if no callback, then do nothing
    if(typeof World.intersection_callback!=="function"){ return; }    
    // find the mouse position (use NDC coordinates, per documentation)
    var mouse_vector = new THREE.Vector3(
      ( event.offsetX / cam_width ) * 2 - 1,
      1 - ( event.offsetY / cam_height ) * 2);
    var projector = new THREE.Projector();
    var raycaster = projector.pickingRay(mouse_vector,Robot.head_camera);
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
  */
  
});