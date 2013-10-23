//importScripts('../lib/three.min.js');
importScripts('../js/util.js');
var a,b,c,d;
var n_quad, n_el, quad_idx;

self.onmessage = function(e) {

  // process the input
  var pixels = new Uint8Array(e.data.buf);
  // max out index ability
  var pixdex = new Uint32Array(e.data.buf);
  // important info
  var width  = e.data.width;
  var height = e.data.height;
  var near   = e.data.depths[0];
  var far    = e.data.depths[1];
  var fov    = e.data.fov;
  var pitch  = e.data.pitch;
  var factor = (far-near)/255;
  var pose   = e.data.pose;

	// TypedArrays to be put into the WebGL buffer
  var positions = new Float32Array( width * height * 3 );
  var colors    = new Float32Array( width * height * 3 );

  // Quads will cite indexed pixels
  var quad_offsets = [];
  // first offset is just zero
  quad_offsets.push({
		index: 0,
    start: 0,
		count: 0,
    row: 0,
	});

  // Access pixel array elements and particle elements
	var pixel_idx    = 0;
  var pixdex_idx   = 0;
  var position_idx = 0;
  
  // for chunks
  var n_last_chunk_el = 0;
  
  // Save the particle with 1 indexed in pixdex
  var idx_idx = 1;

  // begin the loop to find particle positions
  n_el = 0;
  pixdex_idx = -1;
  pixel_idx = -4;
  for (var j = 0; j<height; j++ ) {
    for (var i = 0; i<width; i++ ) {
      
      // next float32 in the image
      pixdex_idx++;
      // move on to the next pixel (RGBA) for next time
      pixel_idx+=4;

      // Grab the pixel data
      var w = pixels[pixel_idx];

      // Compute the xyz positions
      var p = get_hokuyo_chest_xyz(i,j,w,width,height,near,far,fov,pitch,pose[i]);
            
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
            
      // jet colors
      
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
    
    // 20000 triangles per offsets = 60000 indexes
    // i think that is right:
    // http://alteredqualia.com/three/examples/webgl_buffergeometry_perf2.html
    var n_plausible_quads = (n_el-n_last_chunk_el)/2; // should be 2
    var n_plausible_index = n_plausible_quads * 6;
    if(n_plausible_index>55000){// heustic number
      quad_offsets[quad_offsets.length-1].row = j;      
      n_last_chunk_el = n_el;
      // break into a new chunk
      quad_offsets.push({
    		index: n_el,
        row: -1,
        start: 0, // this will change anyway
    		count: 0, // ditto
    	});
    }
	} // for j in height
  
  quad_offsets[quad_offsets.length-1].row = j;
  
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
  var offset_num = 0;
  var cur_offset = quad_offsets[offset_num];
  var face_count = 0;
  for (var j = 0; j<height; j++ ) {
    
    for (var i = 0; i<width; i++ ) {
      
      // use a temporary index
      var tmp_idx = pixdex_idx;
      
      // ready for next iteration
      pixdex_idx++;
      
      // a of the quad
      var a_position_idx = pixdex[tmp_idx]-1;
      if(a_position_idx<0){continue;}
            
      // b of the quad
      var b_position_idx = pixdex[tmp_idx+1]-1;
      if(b_position_idx<0){continue;}
      
      // go to the next row
      tmp_idx+=width;
      
      // c of the quad
      var c_position_idx = pixdex[tmp_idx]-1;
      if(c_position_idx<0){continue;}
            
      // d of the quad
      var d_position_idx = pixdex[tmp_idx+1]-1;
      if(d_position_idx<0){continue;}
      
      // x, y, z of this position
      //a = positions.subarray(a_position_idx, a_position_idx+3);
      //b = positions.subarray(b_position_idx, b_position_idx+3);
      //c = positions.subarray(c_position_idx, c_position_idx+3);
      //d = positions.subarray(d_position_idx, d_position_idx+3);
      //if(positions[a_position_idx]-positions[b_position_idx]>1000){continue;}
      
      // We have a valid quad!
      n_quad++;
      
      // find the quad index offset
      var quad_index_offset = cur_offset.index;
      
      // Add the upper tri
      index[quad_idx]   = a_position_idx-quad_index_offset;
      index[quad_idx+1] = c_position_idx-quad_index_offset;
      index[quad_idx+2] = b_position_idx-quad_index_offset;
      // add the lower tri
      index[quad_idx+3] = d_position_idx-quad_index_offset;
      index[quad_idx+4] = b_position_idx-quad_index_offset;
      index[quad_idx+5] = c_position_idx-quad_index_offset;
      
      face_count+=2;
      
      quad_idx+=6;

    } // for i
    
    // check the offset index
    var offset_row = cur_offset.row;
    if( j==offset_row ){
      cur_offset.count = 3*face_count;
      face_count = 0;
      offset_num++;
      if(offset_num>=quad_offsets.length){break;}
      cur_offset = quad_offsets[offset_num];
      cur_offset.start = quad_idx;
      j++;
      pixdex_idx+=width;
    }
    
  } // for j
  
  // final offset count
  cur_offset.count = 3*face_count;

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
