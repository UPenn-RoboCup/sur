var ready = false;
// Set up LUT for real xyz positions
//https://github.com/OpenNI/OpenNI2/blob/master/Source/Core/OniStream.cpp#L362
var horiz_sz = 500;
var vert_sz = 480;
var hFOV = 1;
var vFOV = 120 * Math.PI/180;
var h_rpp = hFOV / horiz_sz;
var v_rpp = vFOV / vert_sz;

self.onmessage = function(e) {
  
	if (!ready) {
		ready = true
		self.postMessage('initialized');
		return;
	}
	// Array to be put into the WebGL buffer
  var positions    = new Float32Array( horiz_sz * vert_sz * 3 );
  var pixels       = new Uint8Array(e.data);
	var pixel_idx    = 0;
  var position_idx = 0;

	var x,y,z,d;
    for (var i = 0; i<horiz_sz; i++ ){
  for(var j=0; j<vert_sz; j++ ){
      var hok_angle     = v_rpp * (j-vert_sz/2);
      var hok_factor_z  = Math.sin(hok_angle);
      var hok_factor_xy = Math.cos(hok_angle);
      // Compute the xyz
      d = pixels[pixel_idx];
      if (d<253){
        var pan_angle = h_rpp * (i-horiz_sz/2);
        var r = ((d / 255) * (2-.1) + .1) * 1000;
  		  x = r * hok_factor_xy * Math.cos(pan_angle);
  		  y = r * hok_factor_xy * Math.sin(pan_angle);
        z = r * hok_factor_z;
        
        positions[position_idx]   = x;
        positions[position_idx+1] = y;
        positions[position_idx+2] = z;        
      } else {
        positions[position_idx]   = 0;
        positions[position_idx+1] = 0;
        positions[position_idx+2] = 0;
      }
      // Increment the pixel idx for the next mesh pixel
      pixel_idx += 4;
      position_idx += 3;
		}
	}
  //self.postMessage(pixels.buffer,[pixels.buffer]);
  self.postMessage(positions.buffer,[positions.buffer]);
};

self.onerror = function(message) {
	self.postMessage('error | '+message);
};
