// Setup the WebSocket connection and callbacks
// Form the mesh image layer
var last_mesh_img, mesh_ctx, mesh_svg;
var head_mesh_raw_ctx, chest_mesh_raw_ctx, kinect_mesh_raw_ctx;
var mesh_clicks, mesh_points, mesh_depths;
var mesh_in_use = 'chest_lidar';
var mesh_width, mesh_height, mesh_fov = [];
var mesh_worker;

document.addEventListener( "DOMContentLoaded", function(){
  var arm_init_btn   = document.getElementById('arm_fsm_init_btn');
  var arm_init_btn   = document.getElementById('arm_fsm_init_btn');

  // Tilt scan
  document.getElementById('head_fsm_scan_btn').addEventListener('click', function() {
    // if testing with the kinect
    var req_url = rest_root+'/s'
    // perform the post request
    promise.post( req_url, {fsm: 'HeadFSM' , evt: 'tiltscan'} ).then(function(error, text, xhr) {
      if(error){ return; }
    });
  }, false);

  // Head center
  document.getElementById('head_fsm_center_btn').addEventListener('click', function() {
    // if testing with the kinect
    var req_url = rest_root+'/s'
    // perform the post request
    promise.post( req_url, {fsm: 'HeadFSM' , evt: 'center'} ).then(function(error, text, xhr) {
      if(error){ return; }
    });
  }, false);

  // Arm init
  document.getElementById('arm_fsm_init_btn').addEventListener('click', function() {
    // if testing with the kinect
    var req_url = rest_root+'/s'
    // perform the post request
    promise.post( req_url, {fsm: 'ArmFSM' , evt: 'init'} ).then(function(error, text, xhr) {
      if(error){ return; }
    });
  }, false);

  // Arm ready
  document.getElementById('arm_fsm_ready_btn').addEventListener('click', function() {
    // if testing with the kinect
    var req_url = rest_root+'/s'
    // perform the post request
    promise.post( req_url, {fsm: 'ArmFSM' , evt: 'ready'} ).then(function(error, text, xhr) {
      if(error){ return; }
    });
  }, false);

  // Arm reset
  document.getElementById('arm_fsm_reset_btn').addEventListener('click', function() {
    // if testing with the kinect
    var req_url = rest_root+'/s'
    // perform the post request
    promise.post( req_url, {fsm: 'ArmFSM' , evt: 'reset'} ).then(function(error, text, xhr) {
      if(error){ return; }
    });
  }, false);

  // Arm grab
  document.getElementById('arm_fsm_grab_btn').addEventListener('click', function() {
    // if testing with the kinect
    var req_url = rest_root+'/s'
    // perform the post request
    promise.post( req_url, {fsm: 'ArmFSM' , evt: 'wheelgrab'} ).then(function(error, text, xhr) {
      if(error){ return; }
    });
  }, false);
  
  // Motion stand
  document.getElementById('motion_fsm_stand_btn').addEventListener('click', function() {
    // if testing with the kinect
    var req_url = rest_root+'/s'
    // perform the post request
    promise.post( req_url, {fsm: 'MotionFSM' , evt: 'stand'} ).then(function(error, text, xhr) {
      if(error){ return; }
    });
  }, false);
  
  // Motion walk
  document.getElementById('motion_fsm_walk_btn').addEventListener('click', function() {
    // if testing with the kinect
    var req_url = rest_root+'/s'
    // perform the post request
    promise.post( req_url, {fsm: 'MotionFSM' , evt: 'walk'} ).then(function(error, text, xhr) {
      if(error){ return; }
    });
  }, false);

  // Body init
  document.getElementById('body_fsm_init_btn').addEventListener('click', function() {
    // if testing with the kinect
    var req_url = rest_root+'/s'
    // perform the post request
    promise.post( req_url, {fsm: 'BodyFSM' , evt: 'init'} ).then(function(error, text, xhr) {
      if(error){ return; }
    });
  }, false);
  
  // Body follow
  document.getElementById('body_fsm_follow_btn').addEventListener('click', function() {
    
    console.log(waypoints);
    
    var rpc_url = rest_root+'/m/hcm/motion/waypoints'
    // perform the post request
    promise.post( rpc_url, {val:JSON.stringify(waypoints)} ).then(function(error, text, xhr) {
      if(error){ return; }
      var rpc_url = rest_root+'/m/hcm/motion/nwaypoints'
      promise.post( rpc_url, {val:JSON.stringify([1])} ).then(function(error, text, xhr) {
        if(error){ return; }
        console.log('gollow!')
        var rpc_url = rest_root+'/s'
        promise.post( rpc_url, {fsm: 'BodyFSM' , evt: 'follow'} ); // waypoints
      }); // nwaypoints
    }); // follow
  }, false);
  
  // Body follow
  document.getElementById('body_fsm_step_btn').addEventListener('click', function() {
    // if testing with the kinect
    var req_url = rest_root+'/s'
    console.log('stepover')
    // perform the post request
    promise.post( req_url, {fsm: 'BodyFSM' , evt: 'stepover'} ).then(function(error, text, xhr) {
      if(error){ return; }
    });
  }, false);
  
  // Lidar pan
  document.getElementById('lidar_fsm_pan_btn').addEventListener('click', function() {
    // if testing with the kinect
    var req_url = rest_root+'/s'
    // perform the post request
    promise.post( req_url, {fsm: 'LidarFSM' , evt: 'pan'} ).then(function(error, text, xhr) {
      if(error){ return; }
    });
  }, false);

}, false);
