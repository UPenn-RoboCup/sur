var DEG_TO_RAD = Math.PI / 180,
	cos = Math.cos,
	sin = Math.sin,
  tan = Math.tan,
	min = Math.min,
  max = Math.max,
	abs = Math.abs,
  robot = {
  	px: 0,
  	py: 0,
  	pa: 0
  },
	near,
	far,
	hfov,
	vfov,
	p,
	cm,
	offset_num,
	cur_offset,
	face_count,
	a_position_idx,
	b_position_idx,
	c_position_idx,
	d_position_idx;

// Returns a point in xyz of the torso frame
/*
	// Must use pose for each scanline
	px = mesh.posex[i];
	py = mesh.posey[i];
	pa = mesh.posez[i];
	*/
// x, y, z in the torso (upper body) frame
// robot: pose (px,py,pa element) and bodyTilt elements
var K2_HFOV_FACTOR = tan(70.6 / 2 * DEG_TO_RAD),
  K2_VFOV_FACTOR = tan(60 / 2 * DEG_TO_RAD),
  MIN_CONNECTIVITY = 75, // points within MIN_CONNECTIVITY of each other are connected
  // Sensor XYZ should always take in millimeters, going forward
  SENSOR_XYZ = {
    kinectV2: function (u, v, w, width, height, robot, destination) {
    	'use strict';
    	var	r = w,
        //r = w * (far - near) / 255 + near, // Convert w of 0-255 to actual meters value
        y = 2 * (u / width - 0.5) * r * K2_HFOV_FACTOR,
        z = -2 * (v / height - 0.5) * r * K2_VFOV_FACTOR,
        x = r;
    	// Set in the THREE.js frame, with millimeters
      destination[0] = y;
      destination[1] = z + 1000;
      destination[2] = x;
    	// Return the position in our own frame
    	return [x, y, z];
    },
    chestLidar: function (u, v, w, width, height, robot, destination) {
    	'use strict';
      // Saturation
      if (w === 0 || w === 255) {return;}
    	var bodyRoll = 0;
      var bodyTilt = 0;
    	var h_angle0 = hfov[1] - u * (hfov[1] - hfov[0]) / width,
    		v_angle = -1 * (v * (vfov[1] - vfov[0]) / height + vfov[0]),
    		h_angle = -a,
    		ch = cos(h_angle),
    		sh = sin(h_angle),
    		cv = cos(v_angle),
    		sv = sin(v_angle),
    		// Convert w of 0-255 to actual meters value
    		// Rotates a *bit* off axis
    		r = w * (far - near) / 255 + near + chest_off_axis,
    		// Place in the frame of the torso
    		//x = (r * cv + chest_offset_x) * ch + chest_joint_x,
    		x = r * cv * ch + chest_joint_x,
    		y = r * cv * sh,
    		z = r * sv + chest_height,
    		cp = cos(bodyTilt),
    		sp = sin(bodyTilt),
    		cr = cos(bodyRoll),
    		sr = sin(bodyRoll),
    		// Update with pitch/roll
    		xx = (cp * x) + (sr * sp * y) + (sp * cr * z),
    		yy = (cr * y) - (sr * z),
    		zz = (-sp * x) + (cp * sr * y) + (cp * cr * z),
			
    		// TODO: supportX?
		
    		// Place into global pose THREE coords
    		pa = robot.pa,
    		ca = cos(pa),
    		sa = sin(pa),
    		tx = robot.px + ca * xx - sa * yy,
    		ty = robot.py + sa * xx + ca * yy,
    		tz = zz + bodyHeight + bH_to_chest;
    	// Return in mm, since THREEjs uses that
    	// Return also the position
    	// Also, swap the coordinates
    	return [ty * 1000, tz * 1000, tx * 1000, xx, yy, zz];
    }
  },
  SENSOR_COLOR = {
    kinectV2: function (xyz, destination) {
			// JET colormap. Colors range from 0.0 to 1.0
      var fourValue = 4 - (4 * max(0, min(1, xyz[2] / 1000))); // z height
			destination[0] = min(fourValue - 1.5, 4.5 - fourValue);
			destination[1] = min(fourValue - 0.5, 3.5 - fourValue);
			destination[2] = min(fourValue + 0.5, 2.5 - fourValue);
    }
  };

this.addEventListener('message', function (e) {
	'use strict';

	var mesh = e.data,
    // Width and height of the 2D range image
  	width = mesh.width,
  	height = mesh.height,
    // Pixels are the values of the ranges, actually.
    pixels = mesh.pixels,
    // Pixdex is now an indexing that overwrites the pixel value
    pixdex = mesh.pixdex,
		// TypedArrays to be put into the WebGL buffer
		positions = mesh.positions,
		colors = mesh.colors,
		index = mesh.index,
    // Index of the 3D position for the WebGL buffer
  	position_idx = 0,
  	// for chunks TODO: describe more in comments
  	n_last_chunk_el = 0,
  	// Save the particle with 1 indexed in pixdex TODO: Comment
  	idx_idx = 1,
  	// TODO: Number of what elements?
  	n_el = 0,
    // Number of quads found
    n_quad = 0,
  	// Access pixel array elements and particle elements
    // TODO: Better comment
  	pixdex_idx = -1,
  	pixel_idx = -1,
		// Quads will cite indexed pixels
		// first offset is just zero
		quad_offsets = [{
			index: 0,
			start: 0,
			count: 0,
			row: 0
		}],
    // Cartesian coordinate formation function
    get_xyz = SENSOR_XYZ.kinectV2,
    // Color formation function
    get_color = SENSOR_COLOR.kinectV2,
    // Loop counters
    i, j,
    // Position of the point
    point_xyz;

	for (j = 0; j < height; j += 1) {
		for (i = 0; i < width; i += 1) {
			// next float32 in the image. += 4 if RGBA image to get each R of the greyscale, for instance
			pixdex_idx += 1;
			// move on to the next pixel (RGBA) for next time
			pixel_idx += 1;
			// Compute and set the xyz positions
			point_xyz = get_xyz(
        i, j, pixels[pixel_idx], width, height, {}, positions.subarray(position_idx, position_idx + 3)
      );
      // Check if we are given a valid point
      if (point_xyz === undefined) {
				// Saturation check
				// NOTE: u32 index. start @1, so we can make things invalid with 0
				pixdex[pixdex_idx] = 0;
				continue;
      }
      // Set the color of this pixel
      get_color(
        point_xyz, colors.subarray(position_idx, position_idx + 3)
      );
      // TODO: Set the normal...
			// Update the particle count, since it is valid
			n_el += 1;
			// Increment the index of where we are in the position typedarray
			position_idx += 3;
			// index of 3 for the positions (mesh knows to use TRIANGLE of 3)
			pixdex[pixdex_idx] = idx_idx;
			// records the number of position indices
			idx_idx += 1;
		} // for i in width

    // TODO: Fix the row/index stuff
		// 20000 triangles per offsets = 60000 indexes
		// i think that is right:
		// http://alteredqualia.com/three/examples/webgl_buffergeometry_perf2.html
		//n_plausible_quads = (n_el - n_last_chunk_el) / 2; // should be 2
		//if (6 * n_plausible_quads > 55000) { // heuristic number
    //if (n_plausible_quads > 9150) { // heuristic number
    if ((n_el - n_last_chunk_el) > 18333) { // heuristic number
      // Save the last chunk element number
      n_last_chunk_el = n_el;
      // Save the row
			quad_offsets[quad_offsets.length - 1].row = j;
			// break into a new chunk
			quad_offsets.push({
				index: n_el,
				row: -1,
				start: 0, // this will change anyway
				count: 0 // ditto
			});
		}
    
	} // for j in height

	quad_offsets[quad_offsets.length - 1].row = height;

	// Allow for maximum number of quads
	// 2 triangles per mesh. 3 indices per triangle
	//index = new this.Uint16Array(n_el * 6);
  
  
  // Reset the pixdex index
	pixdex_idx = 0;
  
  var pixdex_next_row_idx = width,
    // Quad points
    quad_A, quad_B, quad_C, quad_D,
    // Quad index
    quad_idx = 0,
    // View of the array there
    quad_idx_view;

	// begin the loop
	offset_num = 0;
	cur_offset = quad_offsets[offset_num];
	face_count = 0;

	// Do not look at the last row/column
	for (j = 0; j < height - 1; j += 1) {
		for (i = 0; i < width - 1; i += 1) {
      // Find the four indices of the quad points
      // First row
			a_position_idx = pixdex[pixdex_idx];
			b_position_idx = pixdex[pixdex_idx + 1];
			pixdex_idx += 1;
      // Next row
			c_position_idx = pixdex[pixdex_next_row_idx];
			d_position_idx = pixdex[pixdex_next_row_idx + 1];
      pixdex_next_row_idx += 1;
      // Check if the quad would contain an invalid point, since wwe use 1 based indexing, with 0 as invalid
			if (a_position_idx === 0 || b_position_idx === 0 || c_position_idx === 0 || d_position_idx === 0) {
				continue;
			}
      // Correct 0-based indexing
      a_position_idx -= 1;
      b_position_idx -= 1;
      c_position_idx -= 1;
      d_position_idx -= 1;
			// Positions of each Quad point
			quad_A = positions.subarray(3 * a_position_idx, 3 * a_position_idx + 3);
			quad_B = positions.subarray(3 * b_position_idx, 3 * b_position_idx + 3);
			quad_C = positions.subarray(3 * c_position_idx, 3 * c_position_idx + 3);
			quad_D = positions.subarray(3 * d_position_idx, 3 * d_position_idx + 3);
			// Ensure that quads are smoothly connected; restrict the derivatives on the durface here
			if (
        abs(quad_A[2] - quad_B[2]) > MIN_CONNECTIVITY || abs(quad_A[2] - quad_C[2]) > MIN_CONNECTIVITY || abs(quad_A[2] - quad_D[2]) > MIN_CONNECTIVITY
      ) {
				continue;
			}
      /*
			// Too high in the air (2m)
			if (a[1] > max_ceiling || b[1] > max_ceiling || c[1] > max_ceiling || d[1] > max_ceiling) {
				continue;
			}
			// Ground (2cm)
			if (a[1] < 20 || b[1] < 20 || c[1] < 20 || d[1] < 20) {
				continue;
			}
      */
			// We have a valid quad!
			n_quad += 1;
			// Find the quad index offset
      quad_idx_view = index.subarray(quad_idx, quad_idx + 6)
      quad_idx += 6;
      // Add the upper tri
			quad_idx_view[0] = a_position_idx - cur_offset.index;
			quad_idx_view[1] = c_position_idx - cur_offset.index;
			quad_idx_view[2] = b_position_idx - cur_offset.index;
			// add the lower tri
			quad_idx_view[3] = d_position_idx - cur_offset.index;
			quad_idx_view[4] = b_position_idx - cur_offset.index;
			quad_idx_view[5] = c_position_idx - cur_offset.index;
      // Faces are triangles. Two faces make a quad
			face_count += 2;
		} // for i

		// Since we do not investiage the last item in the row, increment
		pixdex_idx += 1;
    pixdex_next_row_idx += 1;

		// check the offset index
		if (j === cur_offset.row) {
			cur_offset.count = 3 * face_count;
			face_count = 0;
			offset_num += 1;
			if (offset_num >= quad_offsets.length) {
				break;
			}
			cur_offset = quad_offsets[offset_num];
			cur_offset.start = quad_idx;
			j += 1;
			pixdex_idx += width;
      pixdex_next_row_idx += width;
		}

	} // for j

	// final offset count
	cur_offset.count = 3 * face_count;

	this.postMessage({
		idx: index.subarray(0, 6 * n_quad),
		pos: positions.subarray(0, 3 * n_el),
		col: colors.subarray(0, 3 * n_el),
    pixdex: pixdex,
		quad_offsets: quad_offsets,
    n_quad: n_quad,
    n_el: n_el
	}, [index.buffer, positions.buffer, colors.buffer]);
}, false);