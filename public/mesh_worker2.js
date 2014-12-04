var chest_height = 0.09,
	chest_joint_x = 0.06,
	chest_off_axis = 0.02,
	neck_height = 0.30,
	neck_off_axis = 0.12,
	bH_to_chest = 0.05,//0.075,
	max_ceiling = 2000,
	CONNECTIVITY = 75,
  DEG_TO_RAD = Math.PI / 180,
	robot = {
		px: 0,
		py: 0,
		pa: 0
	},
	bodyHeight = 0.93,
	cos = Math.cos,
	sin = Math.sin,
  tan = Math.tan,
	min = Math.min,
  max = Math.max,
	abs = Math.abs,
	near,
	far,
	width,
	height,
	hfov,
	vfov,
	a,
	b,
	c,
	d,
	i,
	j,
	w,
	p,
	cm,
	n_quad,
	n_el,
	quad_idx,
	three_and_local_pos,
	n_plausible_quads,
	n_plausible_index,
	offset_num,
	cur_offset,
	face_count,
	tmp_idx,
	a_position_idx,
	b_position_idx,
	c_position_idx,
	d_position_idx,
	quad_index_offset,
	offset_row,
	fourValue,
	mesh,
	pixel_idx,
	pixdex_idx,
	position_idx,
	// for chunks
	n_last_chunk_el,
	// Save the particle with 1 indexed in pixdex
	idx_idx;

// Returns a point in xyz of the torso frame
/*
	// Must use pose for each scanline
	px = mesh.posex[i];
	py = mesh.posey[i];
	pa = mesh.posez[i];
	*/
// x, y, z in the torso (upper body) frame
// robot: pose (px,py,pa element) and bodyTilt elements
function get_kinect2_xyz(u, v, w, bodyTilt, bodyRoll) {
	'use strict';
	bodyRoll = bodyRoll || 0;
  bodyTilt = bodyTilt || 0;
	var	r = w,
    //r = w * (far - near) / 255 + near, // Convert w of 0-255 to actual meters value
    y = 2 * (u / width - 0.5) * r * tan(70.6 / 2 * DEG_TO_RAD),
    z = -2 * (v / height - 0.5) * r * tan(60 / 2 * DEG_TO_RAD),
    x = r;
	// Return in mm, since THREEjs uses that
	// Return also the position
	// Also, swap the coordinates
	return [y, z + 1000, x,     x, y, z];
}

this.addEventListener('message', function (e) {
	'use strict';

	mesh = e.data;
	width = mesh.width;
	height = mesh.height;

	position_idx = 0;
	// for chunks
	n_last_chunk_el = 0;
	// Save the particle with 1 indexed in pixdex
	idx_idx = 1;
	// begin the loop to find particle positions
	n_el = 0;
	// Access pixel array elements and particle elements
	pixdex_idx = -1;
	pixel_idx = -1;

	// Format our data
	var pixels = mesh.pixels,
		pixdex = mesh.pixdex,
		// TypedArrays to be put into the WebGL buffer
		positions = mesh.positions,
		colors = mesh.colors,
		index = mesh.index,
		// Quads will cite indexed pixels
		// first offset is just zero
		quad_offsets = [{
			index: 0,
			start: 0,
			count: 0,
			row: 0
		}];

	for (j = 0; j < height; j += 1) {
		for (i = 0; i < width; i += 1) {
			// next float32 in the image
			pixdex_idx += 1;
			// move on to the next pixel (RGBA) for next time
			pixel_idx += 1;

			// Grab the pixel data
			w = pixels[pixel_idx];

/*
			if (w === 0 || w === 255) {
				// Saturation check
				// NOTE: u32 index. start @1, so we can make things invalid with 0
				pixdex[pixdex_idx] = 0;
				continue;
			}
*/

			// Compute the xyz positions from the LIDAR
			three_and_local_pos = get_kinect2_xyz(i, j, w);

			// Could make this faster?
			positions[position_idx] = three_and_local_pos[0];
			positions[position_idx + 1] = three_and_local_pos[1];
			positions[position_idx + 2] = three_and_local_pos[2];

			// jet colors
			//fourValue = 4 - (4 * max(three_and_local_pos[3] / 4000, 0));
      fourValue = 4 - (4 * max(0, min(1, three_and_local_pos[5] / 1000))); // z height
			colors[position_idx] = min(fourValue - 1.5, 4.5 - fourValue);
			colors[position_idx + 1] = min(fourValue - 0.5, 3.5 - fourValue);
			colors[position_idx + 2] = min(fourValue + 0.5, 2.5 - fourValue);
      /*
			colors[position_idx] = 1;
			colors[position_idx + 1] = 0;
			colors[position_idx + 2] = 1;
      */

			// index of 3 for the positions (mesh knows to use TRIANGLE of 3)
			pixdex[pixdex_idx] = idx_idx;

			// Save the pixel particle, since it is valid
			n_el += 1;

			// Increment the index of where we are in the position typedarray
			position_idx += 3;

			// records the number of position indices
			idx_idx += 1;

		} // for i in width

		// 20000 triangles per offsets = 60000 indexes
		// i think that is right:
		// http://alteredqualia.com/three/examples/webgl_buffergeometry_perf2.html
		n_plausible_quads = (n_el - n_last_chunk_el) / 2; // should be 2
		n_plausible_index = n_plausible_quads * 6;
		if (n_plausible_index > 55000) { // heuristic number
			quad_offsets[quad_offsets.length - 1].row = j;
			n_last_chunk_el = n_el;
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

	n_quad = 0;
	quad_idx = 0;
	pixdex_idx = 0;

	// begin the loop
	offset_num = 0;
	cur_offset = quad_offsets[offset_num];
	face_count = 0;

	// Do not look at the last row/column
	for (j = 0; j < height - 1; j += 1) {

		for (i = 0; i < width - 1; i += 1) {

			// use a temporary index
			tmp_idx = pixdex_idx;

			// ready for next iteration
			pixdex_idx += 1;

			// a of the quad
			a_position_idx = pixdex[tmp_idx] - 1;
			if (a_position_idx < 0) {
				continue;
			}

			// b of the quad
			b_position_idx = pixdex[tmp_idx + 1] - 1;
			if (b_position_idx < 0) {
				continue;
			}

			// go to the next row
			tmp_idx += width;

			// c of the quad
			c_position_idx = pixdex[tmp_idx] - 1;
			if (c_position_idx < 0) {
				continue;
			}

			// d of the quad
			d_position_idx = pixdex[tmp_idx + 1] - 1;
			if (d_position_idx < 0) {
				continue;
			}

			// x, y, z of this position
			a = positions.subarray(3 * a_position_idx, 3 * a_position_idx + 3);
			b = positions.subarray(3 * b_position_idx, 3 * b_position_idx + 3);
			c = positions.subarray(3 * c_position_idx, 3 * c_position_idx + 3);
			d = positions.subarray(3 * d_position_idx, 3 * d_position_idx + 3);

			// Ensure that quads are smoothly connected; restrict the derivatives on the durface here
			if (abs(a[2] - b[2]) > CONNECTIVITY || abs(a[2] - c[2]) > CONNECTIVITY || abs(a[2] - d[2]) > CONNECTIVITY) {
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

			// find the quad index offset
			quad_index_offset = cur_offset.index;

			// Add the upper tri
			index[quad_idx] = a_position_idx - quad_index_offset;
			index[quad_idx + 1] = c_position_idx - quad_index_offset;
			index[quad_idx + 2] = b_position_idx - quad_index_offset;
			// add the lower tri
			index[quad_idx + 3] = d_position_idx - quad_index_offset;
			index[quad_idx + 4] = b_position_idx - quad_index_offset;
			index[quad_idx + 5] = c_position_idx - quad_index_offset;
			// Maybe [quad_idx++] is better... must do an operation anyway...
			quad_idx += 6;

			face_count += 2;

			// We have a valid quad!
			n_quad += 1;

		} // for i

		// ready for next iteration
		pixdex_idx += 1;

		// check the offset index
		offset_row = cur_offset.row;
		if (j === offset_row) {
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