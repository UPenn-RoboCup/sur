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
  var pixels = new Uint8Array(e.data.buf); //just modify this!
  var width  = e.data.res[0];
  var height = e.data.res[1];
  var near   = e.data.dep[0];
  var far    = e.data.dep[1];
  var hFOV   = e.data.fov[0];
  var vFOV   = e.data.fov[1];

	// Array to be put into the WebGL buffer
  var positions = new Float32Array( width * height * 3 );
  var colors    = new Float32Array( width * height * 3 );

  // Access pixel array elements and particle elements
	var pixel_idx    = 0;
  var position_idx = 0;

  // begin the loop to find particle positions
  var n_el = 0;
  for (var j = 0; j<height; j++ ) {
    for (var i = 0; i<width; i++ ) {
      // Compute the xyz positions
      var w = pixels[pixel_idx];
      var p = get_hokuyo_chest_xyz(i,j,w,width,height,near,far,hFOV,vFOV);
      // saturation check
      if(p===null){
        pixels[pixel_idx]=0;
        pixel_idx+=4;
        continue;
      }

      // z check 5cm within the ground plane
      if( Math.abs(p[2])<0.050 ){
        pixels[pixel_idx]=0;
        pixel_idx+=4;
        continue;
      }

      // we have an element!
      n_el++;

      // Save the distance in pixels array
      
      positions[position_idx]   =  p[1] * 1000;
      positions[position_idx+1] =  p[2] * 1000;
      positions[position_idx+2] =  p[0] * 1000;

      // jet
      var cm = jet(w);
      colors[ position_idx ]     = cm[0];
      colors[ position_idx + 1 ] = cm[1];
      colors[ position_idx + 2 ] = cm[2];
      // move the indices
      position_idx += 3;
      pixel_idx+=4;
		}
	}

  // post a message of the elements
  var el = {}
  el.pos = positions.buffer;
  el.col = colors.buffer;//.slice(0,n_el)
  el.n_el = n_el;

  self.postMessage(el,[el.pos, el.col]);
};

self.onerror = function(message) {
	self.postMessage('error | '+message);
};
