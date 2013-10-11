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
  var pixels = new Uint8Array(e.data.buf); //just modify this!
  var width  = e.data.res[0];
  var height = e.data.res[1];
  var near   = e.data.dep[0];
  var far    = e.data.dep[1];
  var hFOV   = e.data.fov[0];
  var vFOV   = e.data.fov[1];
  var factor = (far-near)/255;

	// Array to be put into the WebGL buffer
  var positions = new Float32Array( width * height * 3 );
  var colors    = new Float32Array( width * height * 3 );
  var indices   = new Uint16Array( width * height );

  // Access pixel array elements and particle elements
	var pixel_idx    = 0;
  var position_idx = 0;
  var idx_idx = -1;

  // begin the loop to find particle positions
  var n_el = 0;
  for (var j = 0; j<height; j++ ) {
    for (var i = 0; i<width; i++ ) {
      idx_idx++;
      // Compute the xyz positions
      var w = pixels[pixel_idx];
      var p = get_hokuyo_chest_xyz(i,j,w,width,height,near,far,hFOV,vFOV);
      // saturation check
      if(p===null){
        pixels[pixel_idx]=0;
        pixel_idx+=4;
        continue;
      }

      // z check 1 inch within the ground plane
      /*
      if( Math.abs(p[2])<0.0254 ){
        pixels[pixel_idx]=0;
        pixel_idx+=4;
        continue;
      }
      */
      // we have an element!
      n_el++;

      // index the pixel
      indices[idx_idx] = position_idx/3;

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
  
  // 2 triangles per mesh. 3 indices per triangle
  var index = new Uint16Array( n_el * 6 );
  var quad_pos = new Float32Array( n_el * 3 );
  var n_quad = 0;
  var d_ep = 100; // mm
  position_idx = -1;
  quad_idx = 0;
  // do not look at the last row/column
  height--;
  width--;
  for (var j = 0; j<height; j++ ) {
    for (var i = 0; i<width; i++ ) {
      var idx = width*j+i;
      var ii = 4*idx;
      var a = pixels[ii];
      if(a==0){continue;}
      // found at least a single valid point
      position_idx++;

      // Check neighbors of the valid point
      var b = pixels[ii+4];
      if(b==0){continue;}
      ii+=(4*width);
      var c = pixels[ii];
      if(c==0){continue;}
      var d = pixels[ii+4];
      if(d==0){continue;}
      
      // Make sure all points are close (enough) to each other
      // via ranges for now
      a = factor*a+near;
      b = factor*b+near;
      c = factor*c+near;
      d = factor*d+near;
      if( Math.abs(a-b)>d_ep || Math.abs(a-c)>d_ep || Math.abs(a-d)>d_ep ){continue;}

      // Found a quad!
      n_quad++;
      // Add the upper tri
      index[quad_idx]   = indices[idx]; //a
      index[quad_idx+1] = indices[idx+width]; //c
      index[quad_idx+2] = indices[idx+1]; //b
      // add the lower tri
      index[quad_idx+3] = indices[idx+width+1]; //d
      index[quad_idx+4] = indices[idx+1]; //b
      index[quad_idx+5] = indices[idx+width]; //c

      // get ready for next quad
      quad_idx+=6;

    }
  }

  // post a message of the elements
  var el = {} // 4 bytes, 3 vertices
  el.pos = positions.buffer.slice(0,12*n_el); //3 float32
  el.col = colors.buffer.slice(0,12*n_el);
  el.idx = index.buffer.slice(0,12*n_quad); //6 uint16
  el.n_el = n_el;
  el.n_quad = n_quad;

  self.postMessage(el,[el.pos, el.col, el.idx]);
};

self.onerror = function(message) {
	self.postMessage('error | '+message);
};
