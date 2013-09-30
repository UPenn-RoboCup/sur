importScripts('../lib/three.min.js');

var ready    = false;
var horiz_sz = 480;
var vert_sz  = 500;
var hFOV     = 1;
var vFOV     = 120 * Math.PI/180;
var h_rpp    = hFOV / horiz_sz;
var v_rpp    = vFOV / vert_sz;
var near = .5, far = 2;
var factor;

self.onmessage = function(e) {
  
	if (!ready) {
		ready = true
    factor = (far-near)/255;
    self.postMessage('initialized');
    //var tmp = new THREE.Vector4()
    //self.postMessage(tmp);
		return;
	}
	// Array to be put into the WebGL buffer
  var positions    = new Float32Array( horiz_sz * vert_sz * 3 );
  // access to the pixels from the JPEG as bytes
  var pixels       = new Uint8Array(e.data.buf);
	var pixel_idx    = 0;
  var position_idx = 0;

	var x,y,z,d,r;
  for (var i = 0; i<horiz_sz; i++ ) {
    var pan_angle = h_rpp * (i-horiz_sz/2);
    for (var j = 0; j<vert_sz; j++ ) {
      var hok_angle     = v_rpp * (j-vert_sz/2);
      var hok_factor_z  = Math.sin(hok_angle);
      var hok_factor_xy = Math.cos(hok_angle);
      // Compute the xyz
      d = pixels[pixel_idx];
      if (d<255 && d>0){
        r = d * factor + near;
  		  x = r * hok_factor_xy * Math.cos(pan_angle);
  		  y = r * hok_factor_xy * Math.sin(pan_angle);
        z = r * hok_factor_z;
        
        // Like webots, we flip some coordinates
        positions[position_idx]   = y;
        positions[position_idx+1] = -z;
        positions[position_idx+2] = -x;        
      } else {
        positions[position_idx]   = -100000; //100m away
        positions[position_idx+1] = 0;
        positions[position_idx+2] = 0;
      }
      // Increment the pixel idx for the next mesh pixel
      pixel_idx += 4;
      position_idx += 3;
		}
	}
  self.postMessage(positions.buffer,[positions.buffer]);
};

self.onerror = function(message) {
	self.postMessage('error | '+message);
};
