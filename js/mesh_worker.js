//importScripts('../lib/three.min.js');
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

  // begin the loop to find particle positions
  for (var j = 0; j<height; j++ ) {
    for (var i = 0; i<width; i++ ) {
      // Compute the xyz
      var p = get_hokuyo_chest_xyz(i,j,pixels[pixel_idx],width,height,near,far,hFOV,vFOV);
      // put into mm
      if(p===null){
        positions[particle_idx]   = 0;
        positions[particle_idx+1] = 0;
        positions[particle_idx+2] = 0;
      } else {
        // THREE x is our negative y (TODO: have in util)
        // THREE y is our x (TODO: have in util)
        // THREE z is our z (TODO: have in util)
        positions[particle_idx]   =  p[1] * 1000;
        positions[particle_idx+1] =  (p[2]+bodyHeight) * 1000;
        positions[particle_idx+2] =  p[0] * 1000;
      }
      // Increment the pixel idx for the next mesh pixel
      pixel_idx += 4;
      particle_idx += 3;
		}
	}

  // Construct the mesh
  var idx_width = 3*width;
  var b_col = 1, b_row = 0; // save the column idx and row idx
  var ai = 0,    ci = idx_width;
  var bi = ai+3, di = ci+3;
  // four corners of the mesh
  var a, b = positions.subarray(ai,ai+2), c, d=positions.subarray(ci,ci+2);
  // do not evaluate the last row, since
  var len = positions.length-idx_width;
  // loop through two rows at the same time
  for (; bi < len; bi+=3) {
    // shift the pixels
    a = b;
    b = positions.subarray(bi,bi+2);
    c = d;
    d = positions.subarray(di,di+2);
    // at the end of the width, there is no b
    if(b_col==width){
      b_col = 0;
      b_row++;
      continue;
    }
    // Process a,b,c,d to make a mesh

    // save where we are
    di+=3;
    b_col++;
  }

  self.postMessage(positions.buffer,[positions.buffer]);
};

self.onerror = function(message) {
	self.postMessage('error | '+message);
};
