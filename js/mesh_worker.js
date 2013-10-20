//importScripts('../lib/three.min.js');
importScripts('../js/util.js');

var ready = false;
var a,b,c,d;
var n_quad, n_el, quad_idx;

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

  // save important positions
  //var positions = [];
  var positions = new Float32Array(65536);
  var colors = new Float32Array(65536);

	// Array to be put into the WebGL buffer
  // This is awful performance... there may be a better way...
  //var positions = new Float32Array( width * height * 3 );
//  var colors    = new Float32Array( width * height * 3 );
  // These indices are for the particle system
  //var indices   = new Uint16Array( width * height );

  /*
  var position_offsets = [];
  position_offsets.push({
		index: 0,
    start: 0,
		count: 0
	});
  var cur_position_offset = 0;
*/

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
  for (var j = 0; j<height; j++ ) {
    for (var i = 0; i<width; i++ ) {
      
      // next float32 in the image
      pixdex_idx++;
      // move on to the next pixel (RGBA) for next time
      pixel_idx+=4;
      
      if(done_positioning){
        pixdex[pixdex_idx] = 0;
        continue;
      }

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
      
      // Transformed to THREEjs coordinates
      /*
      positions[position_idx]   = p[1] * 1000;
      positions[position_idx+1] = p[2] * 1000;
      positions[position_idx+2] = p[0] * 1000;
      */

      // fast?
      positions[position_idx]   = p[1] * 1000;
      positions[position_idx+1] = p[2] * 1000;
      positions[position_idx+2] = p[0] * 1000;
      
      position_idx += 3;
      //if(position_idx>(65536-3)){done_positioning = true;}
      
      // jet colors if desired
      
      var cm = jet(w);
      colors[ position_idx ]     = cm[0];
      colors[ position_idx + 1 ] = cm[1];
      colors[ position_idx + 2 ] = cm[2];
      
      // index of 3 for the positions (mesh knows to use TRIANGLE of 3)
      pixdex[pixdex_idx] = idx_idx;
      
      // records the number of position indices
      idx_idx++;
      if(idx_idx>=65536){done_positioning = true;}

      // we have an element!
      n_el++;

      /*
      // index the pixel for the particle system
      var chunk = Math.floor(idx_idx/65536);
      pixdex[pixdex_idx] = chunk+1; // (valid) chunk index
      // +1 to differentiate from invalid chunk
      
      // Index must be in 2^16 for 16 bit indices
      var index = idx_idx % 65536;
      pixdex[pixdex_idx+1] = index; // (valid) index

      var cur_chunk = position_offsets[cur_position_offset].index;
      if(chunk!=cur_chunk){
        position_offsets.push({
      		index: chunk,
          start: 65536*chunk,
      		count: 1
      	});
        cur_position_offset++;
      } else {
        position_offsets[cur_position_offset].count++;
      }
      
      // Save the index for use in the particle system
      indices[idx_idx] = index;
      */
		}
	}
  
  //  var d_ep = 100; // mm? m?
  
  // 2 triangles per mesh. 3 indices per triangle
  var index = new Uint16Array( Math.min(65536,n_el) * 6 );

  /*
  // 
  var quad_pos = new Float32Array( n_el * 3 * 4 );
  
  var quad_offsets = [];
  quad_offsets.push({
		index: 0,
    start: 0,
		count: 0
	});
  var cur_quad_offsets = 0;
  quad_pos_idx = 0;
  position_idx = -1;
*/
  
  n_quad = 0;
  quad_idx = 0;
  pixdex_idx = 0;
  
  // do not look at the last row/column
  height--;
  width--;
  // begin the loop
  for (var j = 0; j<height; j++ ) {
    for (var i = 0; i<width; i++ ) {
      
      var tmp_idx = pixdex_idx;
      // ready for next iteration
      pixdex_idx++;
      
      // a of the quad
      var a_position_idx = pixdex[tmp_idx]-1;
      if(a_position_idx<0){continue;}
      // x, y, z of this position
      a = positions.subarray(a_position_idx, a_position_idx+3);
      //a = positions.slice(a_position_idx, a_position_idx+3);
      
      // Check neighbors of the valid point
      
      // b of the quad
      var b_position_idx = pixdex[tmp_idx+1]-1;
      if(b_position_idx<0){continue;}
      // x, y, z of this position
      var b = positions.subarray(b_position_idx, b_position_idx+3);
      //b = positions.slice(b_position_idx, b_position_idx+3);
      
      // go to the next row
      tmp_idx+=width;
      
      // c of the quad
      var c_position_idx = pixdex[tmp_idx]-1;
      if(c_position_idx<0){continue;}
      // x, y, z of this position
      c = positions.subarray(c_position_idx, c_position_idx+3);
      //c = positions.slice(c_position_idx, c_position_idx+3);
      
      // d of the quad
      var d_position_idx = pixdex[tmp_idx+1]-1;
      if(d_position_idx<0){continue;}
      // x, y, z of this position
      d = positions.subarray(d_position_idx, d_position_idx+3);
      //d = positions.slice(d_position_idx, d_position_idx+3);
      
      // Add the upper tri
      index[quad_idx]   = a_position_idx;
      index[quad_idx+1] = c_position_idx;
      index[quad_idx+2] = b_position_idx;
      // add the lower tri
      index[quad_idx+3] = d_position_idx;
      index[quad_idx+4] = b_position_idx;
      index[quad_idx+5] = c_position_idx;
      quad_idx+=6;
      
      /*
      // make the quad positions
      var a_idx = quad_pos_idx;
      var b_idx = quad_pos_idx+3;
      var c_idx = quad_pos_idx+6;
      var d_idx = quad_pos_idx+9;
      // we really make too many positions, but w/e
      quad_pos.set(a,a_idx);
      quad_pos.set(b,b_idx);
      quad_pos.set(c,c_idx);
      quad_pos.set(d,d_idx);
      
      // Add the upper tri
      index[quad_idx]   = a_idx;
      index[quad_idx+1] = c_idx;
      index[quad_idx+2] = b_idx;
      // add the lower tri
      index[quad_idx+3] = d_idx;
      index[quad_idx+4] = b_idx;
      index[quad_idx+5] = c_idx;
      // get ready for next quad
      quad_pos_idx+=12;
      quad_idx+=6;

      // Index must be in 2^16 for 16 bit indices
      var max_quad_index = quad_idx-1;
      var max_quad_chunk = Math.floor(max_quad_index/65536);

      var cur_chunk = quad_offsets[cur_quad_offsets].index;
      if(max_quad_chunk!=cur_chunk){
        quad_offsets.push({
      		index: cur_chunk+1,
          start: 65536*cur_chunk,
      		count: 1
      	});
        cur_quad_offsets++;
      } else {
        // 6 points in the quad, since two tri must be indexed
        quad_offsets[cur_quad_offsets].count+=6;
      }
      */
      
      // keep track of how many quads we have
      n_quad++;

    }
  }

  // post a message of the elements
  var el = {} // 4 bytes, 3 vertices
  // TODO: Do not slice, just reduce the view
  el.idx = index.buffer;
  el.pos = positions.buffer;
  el.col = colors.buffer;
  //el.pos = quad_pos.buffer;
  //el.pos = positions.buffer.slice(0,12*n_el); //3 float32
  //el.col = colors.buffer.slice(0,12*n_el);
  //el.idx = index.buffer.slice(0,12*n_quad); //6 uint16
  el.n_el = n_el;
  el.n_quad = n_quad;
  //el.particle_offsets = position_offsets;
  //el.quad_offsets = quad_offsets;

  self.postMessage(el,[el.pos, el.idx]);
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
