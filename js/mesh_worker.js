importScripts('../lib/three.min.js');
importScripts('../js/util.js');

var ready = false;

self.onmessage = function(e) {
  
	if (!ready) {
		ready = true
    self.postMessage('initialized');
		return;
	}

  // process the input
  var pixels = new Uint8Array(e.data.buf);
  var width  = e.data.res[0];
  var height = e.data.res[1];
  var near   = e.data.dep[0];
  var far    = e.data.dep[1];
  var hFOV   = e.data.fov[0];
  var vFOV   = e.data.fov[1];

	// Array to be put into the WebGL buffer
  var positions    = new Float32Array( width * height * 3 );

  // Access pixel array elements and particle elements
	var pixel_idx    = 0;
  var particle_idx = 0;

  // begin the loop
  for (var i = 0; i<width; i++ ) {
    for (var j = 0; j<height; j++ ) {
      // Compute the xyz
      var p = get_hokuyo_chest_xyz(i,j,pixels[pixel_idx],width,height,near,far,hFOV,vFOV);
      // put into mm
      if(p!==undefined){
        // THREE x is our negative y (TODO: have in util)
        // THREE y is our x (TODO: have in util)
        // THREE z is our z (TODO: have in util)
        positions[particle_idx]   = -p.y * 1000;
        positions[particle_idx+1] = p.x  * 1000;
        positions[particle_idx+2] = p.z  * 1000;
      }
      // Increment the pixel idx for the next mesh pixel
      pixel_idx += 4;
      particle_idx += 3;
		}
	}
  self.postMessage(positions.buffer,[positions.buffer]);
};

self.onerror = function(message) {
	self.postMessage('error | '+message);
};
