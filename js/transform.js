//////////////////
// Robot properties for where the LIDARs are
//////////////////
var chest_height   = 0.10;
var chest_joint_x  = 0.05;
var chest_offset_x = 0.01;
var chest_off_axis = 0.0; // no need... (lidar reception off axis)
//
var neck_height    = 0.30;
var neck_off_axis  = 0.12;
/* robot bodyHeight, but this can change a LOT */
var bodyTilt = 11*Math.PI/180;
var bodyHeight = 0.9285318; // nominal height
var supportX = 0.0515184 + 0.01;
//
var robot_pose = [0,0,0];

var jet = function(val){
  //val = Math.min(Math.max(val,0),255);
  // http://www.metastine.com/?p=7
  var fourValue = 4-(4 * val)/255;
  return [ 255*Math.min(fourValue - 1.5, -fourValue + 4.5),
           255*Math.min(fourValue - 0.5, -fourValue + 3.5),
           255*Math.min(fourValue + 0.5, -fourValue + 2.5) ]
}

// convert location
var get_kinect_xyz = function(u,v,w,width,height,near,far,hFOV,vFOV){
  // Convert w of 0-255 to actual meters value
  var factor = (far-near)/255;
  var x = factor*w+near;
  var y = Math.tan(hFOV/2)*2*(u/width-.5)*x;
  var z = Math.tan(vFOV/2)*2*(.5-v/height)*x;
  return new THREE.Vector3( x, y, z );
}

var get_hokuyo_head_xyz = function(u,v,w,width,height,near,far,hFOV,vFOV,pitch){
  // do not use saturated pixels
  if(w==0||w==255){return;}
  //console.log(u,v,w,width,height,near,far,hFOV,vFOV);
  // radians per pixel
  var h_rpp = hFOV / width;
  var v_rpp = vFOV / height;
  // angle in radians of the selected pixel
  var h_angle = h_rpp * (width/2-u);
  var v_angle = v_rpp * (v-height/2);
  // Convert w of 0-255 to actual meters value
  var factor = (far-near)/255;
  var r = factor*w+near;
  var dx = r * Math.cos(h_angle);
  //
  var x = dx * Math.cos(h_angle) + Math.sin(v_angle)*neck_off_axis;
  var y = r  * Math.sin(h_angle);
  var z = -dx * Math.sin(h_angle) + Math.cos(v_angle)*neck_off_axis + neck_height;
  
  // rotate for pitch compensation
  var cp = Math.cos(pitch);
  var sp = Math.sin(pitch);
  var xx = cp*x + sp*z;
  var zz = -sp*x + cp*z;

  // return the global point vector
  return [xx,y,zz,r];
}

var get_hokuyo_chest_xyz = function(u,v,w,mesh){
  // do not use saturated pixels
  if(w==0||w==255){return;}
  
  // Convert w of 0-255 to actual meters value
  var near   = mesh.depths[0];
  var far    = mesh.depths[1];
  var factor = (far-near)/255;
  var r = factor*w + near + chest_off_axis;
  
  // bodyTilt compensation (should be pitch in the future)
  var pitch  = mesh.pitch;
  var cp = Math.cos(pitch);
  var sp = Math.sin(pitch);
  
  // Field of View fixing
  var fov = mesh.fov;
  
  // radians per pixel
  var hFOV  = fov[1]-fov[0];
  var h_rpp = hFOV / width;
  var h_angle = h_rpp * (width/2-u);
  var ch = Math.cos(h_angle);
  var sh = Math.sin(h_angle);
  
  // Radians per pixel
  var vFOV  = fov[3]-fov[2];
  var v_rpp = vFOV / height;
  var v_angle = v_rpp * v + fov[2];
  var cv = Math.cos(v_angle);
  var sv = Math.sin(-1*v_angle);
  
  // default
  var x = (r * cv + chest_offset_x) * ch + chest_joint_x;
  var y = r * cv * sh;
  var z = r * sv + chest_height;
  
  // rotate for pitch compensation
  var xx =  cp*x + sp*z + supportX;
  var zz = -sp*x + cp*z + bodyHeight;
  
  // Place into global pose
  var px = mesh.posex[u];
  var py = mesh.posey[u];
  var pa = mesh.posez[u]; // bad z naming convention :P
  var ca = Math.cos(pa);
  var sa = Math.sin(pa);
  return [ px + ca*xx-sa*y, py + sa*xx+ca*y, zz, r]; 
}

// get a global point, and put it in the torso reference frame
var point_to_torso = function(x,y,z){
  // Make a relative pose
  var ca = Math.cos(robot_pose[2]);
  var sa = Math.sin(robot_pose[2]);
  var px = x-robot_pose[0];
  var py = y-robot_pose[1];
  x =  ca*px + sa*py;
  y = -sa*px + ca*py;
  /*
  var pa = (z-robot_pose[2]) % (2*math.pi);
  if (pa >= Math.PI){pa = pa - 2*Math.PI;}
  */
  
  // kill off some body transformations
  z -= bodyHeight;
  x -= supportX;
  
  // Invert bodyTilt
  var cp = Math.cos(bodyTilt);
  var sp = Math.sin(bodyTilt);
  // rotate for pitch compensation
  var xx = cp*x - sp*z;
  var zz = sp*x + cp*z;
  
  // More body transformations
  xx -= chest_joint_x;
  zz -= chest_height;
  
  return [xx,y,zz];
}

var make_quads = function(mesh){
  
  // Format our data
  var pixels = new Uint8Array(mesh.buf);
  var pixdex = new Uint32Array(mesh.buf);
  var width  = mesh.width;
  var height = mesh.height;

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
  
  var a,b,c,d;
  var n_quad, n_el, quad_idx;
  
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
      var p = get_hokuyo_chest_xyz(i,j,w,mesh);
            
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
  
  // Return the table
  return el;
}