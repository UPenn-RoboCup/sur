

// Find the handle parameters based on three clicked points
var calculate_handle = function(points){
    var knob     = points[0];
    var endpoint = points[1];
    var diff = new THREE.Vector3();
    diff.subVectors( endpoint, knob );

    // Find the center of the handle
    var center = new THREE.Vector3();
    center.addVectors( knob, endpoint ).divideScalar(2);
    if(center.x > .5 || center.x < 0.10){
      // x distance in meters
      console.log('Handle is too far or too close!',center);
      return;
    }

    // Find the length of the handle
    var diff = new THREE.Vector3();
    diff.subVectors( endpoint, knob );
    var length = diff.length();
    if (length>1 || length<0.10){
      // radius in meters
      console.log('Length is too big or too small!',length);
      return;
    }

    // find the yaw/pitch of the wheel
    var yaw   = Math.atan2( diff.y, diff.x);
    var pitch_diff = new THREE.Vector3();
    pitch_diff.subVectors(top,center);
    var pitch = Math.atan2( pitch_diff.x, pitch_diff.z);

    var wheel = [ ]

    console.log('Found handle',center,yaw,pitch,length);
    //handle = [grip_pos handle_yaw handle_roll handle_length];
    //CONTROL.send_control_packet('GameFSM',MODELS.ooi,'hcm','door','handle',handle);
}