var PI = Math.PI,
  DEG_TO_RAD = PI / 180,
	floor = Math.floor,
	cos = Math.cos,
	sin = Math.sin,
  tan = Math.tan,
  atan = Math.atan,
	min = Math.min,
  max = Math.max,
	abs = Math.abs,
  tfK2L, tfK2G;

function flat2mat(flat){
	'use strict';
  return [
    flat.slice(0,4),
    flat.slice(4,8),
    flat.slice(8,12),
    flat.slice(12,16)
  ];
}

function mat_times_vec(m, v){
	'use strict';
	return m.map(function(r){
		return r[0]*this[0] + r[1]*this[1] + r[2]*this[2] + r[3];
	}, v);
}

/*
function rpy_trans(r,v){
	'use strict';
  var alpha = r[0],
    beta = r[1],
    gamma = r[2];
  return [
    [cos(alpha) * cos(beta), cos(alpha) * sin(beta) * sin(gamma) - sin(alpha) * cos(gamma), cos(alpha) * sin(beta) * cos(gamma) + sin(alpha) * sin(gamma), v[0]],
    [sin(alpha) * cos(beta), sin(alpha) * sin(beta) * sin(gamma) + cos(alpha) * cos(gamma), sin(alpha) * sin(beta) * cos(gamma) - cos(alpha) * sin(gamma), v[1]],
    [-sin(beta), cos(beta) * sin(gamma), cos(beta) * cos(gamma), v[2]],
    [0, 0, 0, 1]
  ];
}
*/

/*
this.importScripts('/js/sylvester-min.js');
function get_k2_transform(head_angles, imu_rpy, body_height){
  return rpy_trans([imu_rpy[1], imu_rpy[2], 0], [0, 0, body_height]).multiply(tNeck).multiply(Matrix.RotationZ(head_angles[1])).multiply(Matrix.RotationY(head_angles[2])).multiply(tKinect);
}

function trans(v){
  return [
    [1,0,0,v[0]],
    [0,1,0,v[1]],
    [0,0,1,v[2]],
    [0,0,0,1],
  ];
}

function map2array(obj){
  var arr = [];
  for(var a in obj){ arr.push(obj[a]); }
  return arr;
}

function get_config(tree, cb){
  var url = "/Config/" + tree.join('/');
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
      cb(JSON.parse(xmlhttp.responseText));
    }
  }
  xmlhttp.open("GET", url, true);
  xmlhttp.send();
}

var tNeck;
get_config(["head","neckOffset"], function(val){
  tNeck = trans(map2array(val));
});
var tKinect;
get_config(["kinect","mountOffset"], function(val){
  var kinect = map2array(val);
  var k_rpy = map2array(kinect[0]),
    k_trans = map2array(kinect[1]);
  tKinect = rpy_trans(k_rpy, k_trans);
  console.log(k_rpy, k_trans, tKinect);
});
*/

// Returns a point in xyz of the torso frame
/*
	// Must use pose for each scanline
	px = mesh.posex[i];
	py = mesh.posey[i];
	pa = mesh.posez[i];
	*/
// x, y, z in the torso (upper body) frame
var K2_HFOV_FACTOR = tan(70.6 / 2 * DEG_TO_RAD),
  K2_VFOV_FACTOR = tan(60 / 2 * DEG_TO_RAD),
  // points within MIN_CONNECTIVITY of each other are connected
	MIN_CONNECTIVITY = 60, // 5cm
  // Sensor XYZ should always take in millimeters, going forward
  SENSOR_XYZ = {
    kinectV2: function (u, v, x, width, height, mesh, destination) {
      // The range value is directly our x coordinate
    	'use strict';
      // 4.5 meters away is too far to render
      if(x > 6000 || x < 200){ return; }
      x /= 1e3;
      var vCam = [
				x,
				2 * x * ( u / width - 0.5) * K2_HFOV_FACTOR,
				-2 * x * (v / height - 0.5) * K2_VFOV_FACTOR
			],
        gFrame = mat_times_vec(tfK2G, vCam),
				lFrame = mat_times_vec(tfK2L, vCam);
      destination[0] = gFrame[1]*1e3;
      destination[1] = gFrame[2]*1e3;
      destination[2] = gFrame[0]*1e3;
      return gFrame.concat(lFrame);
    },
    kinectV2webots: function (u, v, x, width, height, mesh, destination) {
      // The range value is directly our x coordinate
      'use strict';
      // 4.5 meters away is too far to render
      if(x >= 6000 || x < 200){ return; }
      //console.log(x);
      x /= 1e3;
      var vCam = [
				x,
				-2 * x * (u / width - 0.5) * K2_HFOV_FACTOR,
				-2 * x * (v / height - 0.5) * K2_VFOV_FACTOR
			],
        gFrame = mat_times_vec(tfK2G, vCam),
				lFrame = mat_times_vec(tfK2L, vCam);
      destination[0] = gFrame[1] * 1e3;
      destination[1] = gFrame[2] * 1e3;
      destination[2] = gFrame[0] * 1e3;
      return gFrame.concat(lFrame);
    },
    mesh0: function (u, v, w, width, height, mesh, destination) {
    	'use strict';
      // Saturation
      if (w === 0 || w === 255) {return;}

    	var tfL6 = mesh.tfL6[v], tfG6 = mesh.tfG6[v],
				h_angle = mesh.a[v],
				v_angle = (mesh.vfov[0] - mesh.vfov[1]) * (u / width) - mesh.vfov[0],
    		ch = cos(h_angle),
    		sh = sin(h_angle),
    		cv = cos(v_angle),
    		sv = sin(v_angle),
    		// Convert w of 0-255 to actual meters value
    		// Rotates a *bit* off axis
    		r = w * (mesh.dynrange[1] - mesh.dynrange[0]) / 255 + mesh.dynrange[0] + 0.02,
    		// Place in the frame of the torso
    		x = r * cv * ch + 0.05, //chest_joint_x
    		y = r * cv * sh,
    		z = r * sv + 0.09,//chest_height
    		// Update with pitch/roll
				// Update with IMU pitch/roll
    		cp = cos(tfL6[4]),
    		sp = sin(tfL6[4]),
    		cr = cos(tfL6[3]),
    		sr = sin(tfL6[3]),
    		xx = (cp * x) + (sr * sp * y) + (sp * cr * z),
    		yy = (cr * y) - (sr * z),
    		zz = (-sp * x) + (cp * sr * y) + (cp * cr * z),
				// Place into the local pose
    		caL = cos(tfL6[5]),
    		saL = sin(tfL6[5]),
    		txL = tfL6[0] + caL * xx - saL * yy,
    		tyL = tfL6[1] + saL * xx + caL * yy,
    		tzL = tfL6[2] + zz,
    		// Place into global pose
    		caG = cos(tfG6[5]),
    		saG = sin(tfG6[5]),
    		txG = tfG6[0] + caG * xx - saG * yy,
    		tyG = tfG6[1] + saG * xx + caG * yy,
    		tzG = tfG6[2] + zz;

			// Set into the THREE buffer, in its coordinate frame
    	destination[0] = tyG * 1000;
			destination[1] = tzG * 1000;
			destination[2] = txG * 1000;

			// Return robot frames, in its coordinates
			// [global | local]
			return [txL, tyL, tzL, txG, tyG, tzG];
    },
		mesh1: function (u, v, w, width, height, mesh, destination) {
    	'use strict';
      // Saturation
      if (w === 0 || w === 255) {return;}
    	var tfL6 = mesh.tfL6[v], tfG6 = mesh.tfG6[v],
				h_angle = mesh.a[v][1] || 0,
				v_angle = (mesh.vfov[0] - mesh.vfov[1]) * (u / width) - mesh.vfov[0],
    		ch = cos(h_angle),
    		sh = sin(h_angle),
    		cv = cos(v_angle),
    		sv = sin(v_angle),
    		// Convert w of 0-255 to actual meters value
    		// Rotates a *bit* off axis
    		r = w * (mesh.dynrange[1] - mesh.dynrange[0]) / 255 + mesh.dynrange[0],
				dx = r * ch,
    		x = dx + sv * 0.12,
				y = r * sh,
				z = -dx * sh + cv * 0.12 + 0.3,
    		// Update with pitch/roll
				// Update with IMU pitch/roll
    		cp = cos(tfL6[4]),
    		sp = sin(tfL6[4]),
    		cr = cos(tfL6[3]),
    		sr = sin(tfL6[3]),
    		xx = (cp * x) + (sr * sp * y) + (sp * cr * z),
    		yy = (cr * y) - (sr * z),
    		zz = (-sp * x) + (cp * sr * y) + (cp * cr * z),
				// Place into the local pose
    		caL = cos(tfL6[5]),
    		saL = sin(tfL6[5]),
    		txL = tfL6[0] + caL * xx - saL * yy,
    		tyL = tfL6[1] + saL * xx + caL * yy,
    		tzL = tfL6[2] + zz,
    		// Place into global pose
    		caG = cos(tfG6[5]),
    		saG = sin(tfG6[5]),
    		txG = tfG6[0] + caG * xx - saG * yy,
    		tyG = tfG6[1] + saG * xx + caG * yy,
    		tzG = tfG6[2] + zz;

			// Set into the THREE buffer, in its coordinate frame
    	destination[0] = tyG * 1000;
			destination[1] = tzG * 1000;
			destination[2] = txG * 1000;

			// Return robot frames, in its coordinates
			// [global | local]
			return [txL, tyL, tzL, txG, tyG, tzG];
    }
  },
  SENSOR_COLOR = {
    mesh: function (i, j, xyz, img, r, destination) {
			'use strict';
			//console.log(r);
			// JET colormap. Colors range from 0.0 to 1.0
      var fourValue = 4 - (4 * max(0, min(1, r/255)));
			destination[0] = min(fourValue - 1.5, 4.5 - fourValue);
			destination[1] = min(fourValue - 0.5, 3.5 - fourValue);
			destination[2] = min(fourValue + 0.5, 2.5 - fourValue);
    },
    kinectV2: function (i, j, xyz, img, r, destination) {
			'use strict';
			// Colors range from 0.0 to 1.0
      //var j2 = floor(2.65 * j) - 6;
			var j2 = floor(2.5 * j) - 16;
      //var j2 = floor(1080 * (0.48 - (0.85)*atan(xyz[2]/xyz[0])));
      //var j2 = floor(1080 * (0.44 - (0.7)*atan(xyz[2]/xyz[0])));
      if (j2 < 0 || j2 >= 1080) { return; }
      //var i2 = 1920 * (0.5 - (0.57)*atan((-xyz[1] - 0.05)/xyz[0]));
			var i2 = 1920 * (0.49 - (0.57)*atan((-xyz[1] - 0.05)/xyz[0]));
      if (i2 < 0 || i2 >= 1920) { return; }
      var idx = 4 * floor(i2 + j2 * 1920);
			destination[0] = img[idx] / 255;
			destination[1] = img[idx + 1] / 255;
			destination[2] = img[idx + 2] / 255;
    },
    kinectV2webots: function (i, j, xyz, img, r, destination, width) {
			'use strict';
      // Colors range from 0.0 to 1.0
      var idx = 4 * floor(i + j * width);
      destination[0] = img[idx] / 255;
      destination[1] = img[idx + 1] / 255;
      destination[2] = img[idx + 2] / 255;
    },

  };

this.addEventListener('message', function (e) {
	'use strict';

  //////////////
  // Convert depth ranges into XYZ coordinates
  // Input: Pre-populated quad_offsets
  //////////////
  // TODO: Fix the naming of variables a bit
	var mesh = e.data,
    // Width and height of the 2D range image
  	width = mesh.width,
  	height = mesh.height,
    // Pixels are the values of the ranges, actually.
    pixels = mesh.pixels,
    // RGB are the color values from the kinect
    rgb = mesh.rgb,
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
    quad_point_count_total = 0,
  	// Access pixel array elements and particle elements
    // TODO: Better comment
  	pixdex_idx = 0,
  	pixel_idx = 0,
		// Quads will cite indexed pixels
		// first offset is just zero
		quad_offsets = [{
			index: 0,
			start: 0,
			count: 0,
			row: 0
		}],
    // Loop counters
    i, j, inc = 1,
    // Position of the point
    point_xyz, point_local,
		// Plot points depending on the sensor
		get_xyz, get_color;
	
	//console.log('Initial Mesh', mesh);

	switch(mesh.id){
		case 'k2_depth':
			tfK2L = flat2mat(mesh.tfL);
			tfK2G = flat2mat(mesh.tfG);
			// Cartesian coordinate formation function
			//get_xyz = SENSOR_XYZ.kinectV2;
			get_xyz = SENSOR_XYZ.kinectV2webots;
			// Color formation function
			//get_color = SENSOR_COLOR.kinectV2;
			get_color = SENSOR_COLOR.kinectV2webots;
			break;
		case 'mesh0':
			get_xyz = SENSOR_XYZ.mesh0;
			get_color = SENSOR_COLOR.mesh;
			inc = 4;
			break;
		case 'mesh1':
			get_xyz = SENSOR_XYZ.mesh1;
			get_color = SENSOR_COLOR.mesh;
			inc = 4;
			break;
		default:
			break;
	}

	for (j = 0; j < height; j += 1) {
		for (i = 0; i < width; i += 1) {
			// Compute and set the xyz positions
			point_xyz = positions.subarray(position_idx, position_idx + 3);
      point_local = get_xyz(
        i, j, pixels[pixel_idx], width, height, mesh, point_xyz
      );

      // Check if we are given a valid point
			// Kill if ground
			// NOTE: Should disable if on rough terrain
      if (!point_local ){//|| point_local[2] < 0.0254) {
				// Saturation check
				// NOTE: u32 index. start @1, so we can make things invalid with 0
				pixdex[pixdex_idx] = 0;
  			// next float32 in the image. += 4 if RGBA image to get each R of the greyscale, for instance
  			pixdex_idx += 1;
  			// move on to the next pixel (RGBA) for next time
  			pixel_idx += inc;
				continue;
      }
      // Set the color of this pixel
      get_color(
        i, j, point_local, rgb, pixels[pixel_idx], colors.subarray(position_idx, position_idx + 3), width, height
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
			// next float32 in the image. += 4 if RGBA image to get each R of the greyscale, for instance
			pixdex_idx += 1;
			// move on to the next pixel (RGBA) for next time
			pixel_idx += inc;
		} // for i in width

    // Use a heurstic for splitting into a new chunk
    // Splitting is needed for lots of triangles: http://alteredqualia.com/three/examples/webgl_buffergeometry_perf2.html
    if ((n_el - n_last_chunk_el) > 18333) {
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
      // TODO: Replicate the last row of the old chunk as the first row in the new chunk
      // NOTE: Cannot do this now, since the index array is the range map array in order to save space...
		}

	} // for j in height

	quad_offsets[quad_offsets.length - 1].row = height;

  //////////////
  // Stitch together Quad faces
  // Input: Pre-populated quad_offsets
  //////////////
  var point_pos_idx = 0,
    point_pos_next_row_idx = width,
    // Quad points
    quad_A, quad_B, quad_C, quad_D,
    // Indices for these points
  	a_position_idx, b_position_idx, c_position_idx, d_position_idx,
    // Quad index
    quad_idx = 0,
    // View of the array there
    quad_idx_view,
    // Track the quad offset
  	offset_num = 0,
    cur_offset = quad_offsets[offset_num],
    // Number of points in this offset
    quad_point_count = 0;

	// Do not look at the last row/column
	for (j = 0; j < height - 1; j += 1) {
		for (i = 0; i < width - 1; i += 1) {
      // Find the four indices of the quad points
      // First row
			a_position_idx = pixdex[point_pos_idx];
			b_position_idx = pixdex[point_pos_idx + 1];
			point_pos_idx += 1;
      // Next row
			c_position_idx = pixdex[point_pos_next_row_idx];
			d_position_idx = pixdex[point_pos_next_row_idx + 1];
      point_pos_next_row_idx += 1;
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

			// We have a valid quad!
			// Find the quad index offset
      quad_idx_view = index.subarray(quad_idx, quad_idx + 6);
      quad_idx += 6;
      // Add the upper tri
			quad_idx_view[0] = a_position_idx - cur_offset.index;
			quad_idx_view[1] = c_position_idx - cur_offset.index;
			quad_idx_view[2] = b_position_idx - cur_offset.index;
			// add the lower tri
			quad_idx_view[3] = d_position_idx - cur_offset.index;
			quad_idx_view[4] = b_position_idx - cur_offset.index;
			quad_idx_view[5] = c_position_idx - cur_offset.index;
      // Faces are triangles. Two faces make a quad. Thus, there are 6 points per quad
			quad_point_count += 6;
      quad_point_count_total += 6;
		} // for i

		// Since we do not investiage the last item in the row, increment
		point_pos_idx += 1;
    point_pos_next_row_idx += 1;

		// check the offset index
		if (j === cur_offset.row) {
      // Store the number of points in the
			cur_offset.count = quad_point_count;
			quad_point_count = 0;
      // Move to the next offset index for quad, if we have any left
			offset_num += 1;
			if (offset_num >= quad_offsets.length) {
				break;
			}
			cur_offset = quad_offsets[offset_num];
      // Save the starting index
			cur_offset.start = quad_idx;
      // Move to the next row, and skip adding the current one.
      // TODO: This leads to breaks, I think
			point_pos_idx += width;
      point_pos_next_row_idx += width;
      j += 1;
		}

	} // for j

	// Count of points for the final offset group
	cur_offset.count = quad_point_count;

  ///////////////
  // Post the data back to the parent
  ///////////////
  delete mesh.pixels;
  delete mesh.pixdex;
	delete mesh.positions;
  delete mesh.colors;
  delete mesh.index;
  mesh.drawCalls = quad_offsets;
  mesh.idx = index.subarray(0, quad_point_count_total);
  mesh.pos = positions.subarray(0, 3 * n_el);
  mesh.col = colors.subarray(0, 3 * n_el);
  mesh.n_el = n_el;
	this.postMessage(mesh, [mesh.idx.buffer, mesh.pos.buffer, mesh.col.buffer]);

	//console.log('Final Mesh',mesh);

}, false);
