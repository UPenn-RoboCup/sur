//importScripts('../lib/three.min.js');
importScripts('../js/util.js');

var ready = false;
var a,b,c,d;
var n_quad, n_el, quad_idx;
var diff_one;

self.onmessage = function(e) {
  
	if (!ready) {
		ready = true
    self.postMessage('initialized');
		return;
	}

  // process the input
  var pixels = new Uint8Array(e.data.buf);
  // max out index ability
  var pixdex = new Uint32Array(e.data.buf);
  var width  = e.data.res[0];
  var height = e.data.res[1];
  var near   = e.data.dep[0];
  var far    = e.data.dep[1];
  var hFOV   = e.data.fov[0];
  var vFOV   = e.data.fov[1];
  var pitch  = e.data.pitch;
  var factor = (far-near)/255;
  
  // maximum number of chunks
  var max_chunks = Math.ceil((width * height * 6) / 65536);
  // divide image at height markers
  var rows_per_chunk = Math.floor(height / max_chunks);

	// Array to be put into the WebGL buffer
  // This is awful performance... there may be a better way...
  var positions = new Float32Array( width * height * 3 );
  var colors    = new Float32Array( width * height * 3 );
  // TODO: Add enough space for the duplicates
  // These indices are for the particle system
  //var indices   = new Uint16Array( width * height );

  // Quads will cite indexed pixels
  var quad_offsets = [];

  // Access pixel array elements and particle elements
	var pixel_idx    = 0;
  var pixdex_idx   = 0;
  var position_idx = 0;
  
  // Save the particle with 1 indexed in pixdex
  var idx_idx = 1;

  // begin the loop to find particle positions
  n_el = 0;
  pixdex_idx = -1;
  pixel_idx = -4;
  var done_positioning = false;
  var prev_pos_idx = 0;
  var prev_chunk_n_el = 0;
  var prev_chunk_start = 0;
  var prev_pos_chunk_idx = 0;
  for (var j = 0; j<height; j++ ) {
    for (var i = 0; i<width; i++ ) {
      
      // next float32 in the image
      pixdex_idx++;
      // move on to the next pixel (RGBA) for next time
      pixel_idx+=4;

      // Grab the pixel data
      var w = pixels[pixel_idx];

      // Compute the xyz positions
      var p = get_hokuyo_chest_xyz(i,j,w,width,height,near,far,hFOV,vFOV,pitch);
      //var p = get_hokuyo_head_xyz(i,j,w,width,height,near,far,hFOV,vFOV,pitch)
            
      // saturation check
      if(p===undefined){
        // u32 index. start @1, so we can make things invalid with 0
        pixdex[pixdex_idx] = 0;
        continue;
      }
      
      // Save the pixel particle, since it is valid
      n_el++;
      
      // Transformed to THREEjs coordinates

      // fast?
      positions[position_idx]   = p[1] * 1000;
      positions[position_idx+1] = p[2] * 1000;
      positions[position_idx+2] = p[0] * 1000;
      
      //if(position_idx>(65536-3)){done_positioning = true;}
      
      // jet colors if desired
      
      //var cm = jet(w);
      var cm = jet(255*(p[0]/far));
      colors[ position_idx ]     = cm[0];
      colors[ position_idx + 1 ] = cm[1];
      colors[ position_idx + 2 ] = cm[2];
      
      // Increment the index of where we are in the position typedarray
      position_idx += 3;
      
      // index of 3 for the positions (mesh knows to use TRIANGLE of 3)
      pixdex[pixdex_idx] = idx_idx;
      // records the number of position indices
      idx_idx++;

		} // for i in width

    // Check if this was the start of a new chunk
    var is_switch_chunk = (j%rows_per_chunk==0);
    if(is_switch_chunk||j==height-1){
      quad_offsets.push({
    		index: Math.ceil(j/rows_per_chunk),
        start: prev_pos_chunk_idx,
    		count: position_idx-prev_pos_chunk_idx
    	});
      
      // Save the index of this chunk
      prev_pos_chunk_idx = position_idx;
    }
    if(is_switch_chunk){
      // Duplicates only from the previous row
      var ndups = position_idx-prev_pos_idx;
      // Look at a view on this array of the dups
      var duplicate_positions = positions.subarray(prev_pos_idx, position_idx);
      // Copy the duplicates
      positions.set(duplicate_positions,ndups);
      // Save the index for the next round
      position_idx+=ndups;
    }
    // save the previous index offset
    prev_pos_idx = position_idx;
	} // for j in height
  
  // Allow for maximum number of quads
  // 2 triangles per mesh. 3 indices per triangle
  var index = new Uint16Array( n_el * 6 );
  
  n_quad = 0;
  quad_idx = 0;
  pixdex_idx = 0;
  
  // do not look at the last row/column
  height--;
  width--;
  // begin the loop
  for (var j = 0; j<height; j++ ) {
    var is_switch_chunk = (j%rows_per_chunk==0);
    if(is_switch_chunk&&j!=0){break;}
    for (var i = 0; i<width; i++ ) {
      
      var tmp_idx = pixdex_idx;
      // ready for next iteration
      pixdex_idx++;
      
      // a of the quad
      var a_position_idx = pixdex[tmp_idx]-1;
      if(a_position_idx<0){continue;}
      // x, y, z of this position
      //a = positions.subarray(a_position_idx, a_position_idx+3);
            
      // b of the quad
      var b_position_idx = pixdex[tmp_idx+1]-1;
      if(b_position_idx<0){continue;}
      // x, y, z of this position
      //b = positions.subarray(b_position_idx, b_position_idx+3);
      
      // go to the next row
      tmp_idx+=width;
      
      // c of the quad
      var c_position_idx = pixdex[tmp_idx]-1;
      if(c_position_idx<0){continue;}
      // x, y, z of this position
      //c = positions.subarray(c_position_idx, c_position_idx+3);
            
      // d of the quad
      var d_position_idx = pixdex[tmp_idx+1]-1;
      if(d_position_idx<0){continue;}
      // x, y, z of this position
      //d = positions.subarray(d_position_idx, d_position_idx+3);

      // We have a valid quad!
      n_quad++;
      
      // Add the upper tri
      index[quad_idx]   = a_position_idx;
      index[quad_idx+1] = c_position_idx;
      index[quad_idx+2] = b_position_idx;
      // add the lower tri
      index[quad_idx+3] = d_position_idx;
      index[quad_idx+4] = b_position_idx;
      index[quad_idx+5] = c_position_idx;
      quad_idx+=6;

    } // for i
  } // for j

  // post a message of the elements
  var el = {} // 4 bytes, 3 vertices
  el.idx    = index.buffer;
  el.pos    = positions.buffer;
  el.col    = colors.buffer;
  el.n_el   = n_el;
  el.n_quad = n_quad;
  el.quad_offsets = quad_offsets;

  self.postMessage(el,[el.pos, el.idx, el.col]);
};

self.onerror = function(message) {
  var obj = {}
  obj.msg = message;
  obj.a   = a;
  obj.b   = b;
  obj.c   = c;
  obj.d   = d;
  obj.n_quad = n_quad;
  obj.n_el = n_el;
  obj.quad_pos_idx = quad_pos_idx;
	self.postMessage(obj);
};
