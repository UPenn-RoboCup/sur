// Find the wheel paramters based on three clicked points
var calculate_wheel = function(points){
    var left  = points[0];
    var right = points[1];
    var top   = points[2];

    // Find the center of the wheel
    var center = (left+right)/2;
    if(center[0] > 1 || center[0] < 0.10){
      // x distance in meters
      alert('Handle is too far or too close!');
      console.log(center);
      return;
    }

    // Find the radius of the wheel
    var handleradius = norm(leftrelpos-rightrelpos)/2;
    if handleradius>1 || handleradius<0.10
        // radius in meters
        disp('Radius is too big or too small!');
        disp(handleradius);
        return;
    end

        handleyaw = atan2(...
            leftrelpos(2)-rightrelpos(2), ...
            leftrelpos(1)-rightrelpos(1)) ...
            - pi/2;
        % TODO: yaw checks

        handlepitch = atan2( ...
          toprelpos(1)-handlepos(1),...
            toprelpos(3)-handlepos(3) );

}
        wheel = [handlepos handleyaw handlepitch handleradius];
        CONTROL.send_control_packet('GameFSM',MODELS.ooi,'hcm','wheel','model', wheel );