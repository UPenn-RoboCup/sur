(function (ctx) {
	'use strict';
	// Function to hold methods
	function Transform() {}

	//////////////////
	// Robot properties for where the LIDARs are
	// TODO: Should fetch these from the server...
	//////////////////
	var chest_height = 0.09,
		chest_joint_x = 0.06,
		chest_off_axis = 0.02,
		neck_height = 0.30,
		neck_off_axis = 0.12,
		bH_to_chest = 0.075,
		cos = Math.cos,
		sin = Math.sin,
		min = Math.min,
		abs = Math.abs;

	function jet(val) {
		// http://www.metastine.com/?p=7
		var fourValue = 4 - (4 * val) / 255;
		return [255 * min(fourValue - 1.5, 4.5 - fourValue),
             255 * min(fourValue - 0.5, 3.5 - fourValue),
             255 * min(fourValue + 0.5, 2.5 - fourValue)];
	}

	// Returns a point in xyz of the torso frame
	function get_hokuyo_chest_xyz(u, v, w, mesh) {
		// do not use saturated pixels
		if (w === 0 || w === 255) {
			return null;
		}
		// Convert w of 0-255 to actual meters value
		var near = mesh.dynrange[0],
			far = mesh.dynrange[1],
			// Field of View for ranges
			// radians per pixel
			width = mesh.width,
			height = mesh.height,
			hfov = mesh.hfov, // width (horizontal) FOV
			vfov = mesh.vfov, // height (vertical) FOV
			// Find the appropriate angles
			h_angle = hfov[1] - u * (hfov[1] - hfov[0]) / width,
			v_angle = -1 * (v * (vfov[1] - vfov[0]) / height + vfov[0]),
			ch = cos(h_angle),
			sh = sin(h_angle),
			cv = cos(v_angle),
			sv = sin(v_angle),
			// Rotates a *bit* off axis
			r = w * (far - near) / 255 + near + chest_off_axis,
			// Place in the frame of the torso
			//x = (r * cv + chest_offset_x) * ch + chest_joint_x,
			x = r * cv * ch + chest_joint_x,
			y = r * cv * sh,
			z = r * sv + chest_height;
		// Return the point in the torso frame
		return [x, y, z];
	}

	// x, y, z in the torso (upper body) frame
	// robot: pose (px,py,pa element) and bodyTilt elements
	function lidar_to_three(x, y, z, robot) {
		robot = robot || {
			bodyTilt: 3 * Math.PI / 180,
			bodyHeight: 0.93,
			px: 0,
			py: 0,
			pa: 0
		};
		// Apply bodyTilt
		var bodyTilt = robot.bodyTilt,
			cp = cos(bodyTilt),
			sp = sin(bodyTilt),
			// Also add supportX and bodyHeight parameters
			xx = cp * x + sp * z, // + robot.supportX
			zz = -sp * x + cp * z + robot.bodyHeight + bH_to_chest,
			// Place into global pose
			pa = robot.pa,
			ca = cos(pa),
			sa = sin(pa),
			// THREE coords
			tx = robot.px + ca * xx - sa * y,
			ty = robot.py + sa * xx + ca * y,
			tz = zz; // + robot.bodyHeight
		// Return in mm, since THREEjs uses that
		// Also, swap the coordinates
		return [ty * 1000, tz * 1000, tx * 1000];
	}

	Transform.make_quads = function (mesh) {
		// Format our data
		var pixels = mesh.pixels,
			pixdex = mesh.pixdex,
			width = mesh.width,
			height = mesh.height,
			// TypedArrays to be put into the WebGL buffer
			positions = mesh.positions,
			colors = mesh.colors,
			index = mesh.index,
			// Quads will cite indexed pixels
			quad_offsets = [],
			// Access pixel array elements and particle elements
			pixel_idx = 0,
			pixdex_idx = 0,
			position_idx = 0,
			// for chunks
			n_last_chunk_el = 0,
			// Save the particle with 1 indexed in pixdex
			idx_idx = 1,
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
			threep,
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
			max_ceiling = 2000;
		// first offset is just zero
		quad_offsets.push({
			index: 0,
			start: 0,
			count: 0,
			row: 0
		});
		// begin the loop to find particle positions
		n_el = 0;
		pixdex_idx = -1;
		pixel_idx = -4;
		//console.log('Mesh', mesh);
		for (j = 0; j < height; j += 1) {
			for (i = 0; i < width; i += 1) {
				// next float32 in the image
				pixdex_idx += 1;
				// move on to the next pixel (RGBA) for next time
				pixel_idx += 4;

				// Grab the pixel data
				w = pixels[pixel_idx];

				// Compute the xyz positions
				p = get_hokuyo_chest_xyz(i, j, w, mesh);

				// saturation check
				if (p === null) {
					// u32 index. start @1, so we can make things invalid with 0
					pixdex[pixdex_idx] = 0;
					continue;
				}

				// Compute the position from the lidar
				// TODO: Add back
				/*
				tmp_robot.px = mesh.posex[i];
				tmp_robot.py = mesh.posey[i];
				tmp_robot.pa = mesh.posez[i];
				*/
				threep = lidar_to_three(p[0], p[1], p[2]);
				//console.log(position_idx, threep);

				// Save the pixel particle, since it is valid
				n_el += 1;
				// Could make this faster?
				positions[position_idx] = threep[0];
				positions[position_idx + 1] = threep[1];
				positions[position_idx + 2] = threep[2];

				// jet colors
				//cm = jet(w);
				cm = jet(255 * (p[0] / mesh.far));
				colors[position_idx] = cm[0];
				colors[position_idx + 1] = cm[1];
				colors[position_idx + 2] = cm[2];

				// index of 3 for the positions (mesh knows to use TRIANGLE of 3)
				pixdex[pixdex_idx] = idx_idx;

				// Increment the index of where we are in the position typedarray
				position_idx += 3;

				// records the number of position indices
				idx_idx += 1;

				/*
        // debug
        if(i==Math.floor(width/2)&&j==Math.floor(height/8)){
          console.log(i,j,pixdex_idx,idx_idx,'idx_idx');
        }
        */

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

		quad_offsets[quad_offsets.length - 1].row = j;

		// Allow for maximum number of quads
		// 2 triangles per mesh. 3 indices per triangle
		// We allocate before
		//index = new window.Uint16Array(n_el * 6);

		n_quad = 0;
		quad_idx = 0;
		pixdex_idx = 0;

		// do not look at the last row/column
		//height--;
		//width--;

		// begin the loop
		offset_num = 0;
		cur_offset = quad_offsets[offset_num];
		face_count = 0;
		for (j = 0; j < height; j += 1) {
			// Do not look at the last row
			if (j === height - 1) {
				break;
			}
			for (i = 0; i < width; i += 1) {

				// use a temporary index
				tmp_idx = pixdex_idx;

				/*
        // debug
        if(i==Math.floor(width/2)&&j==Math.floor(height/8)){
          console.log(i,j,tmp_idx,pixdex[tmp_idx],'tmp_idx');
        }
        */

				// ready for next iteration
				pixdex_idx += 1;

				// Do not look at the last column
				if (i === height - 1) {
					continue;
				}

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

				/*
        if(i==Math.floor(width/2)&&j==Math.floor(height/8)){
          console.log(i,j,a,b,c,d,'position');
        }
        */
				// Ensure that quads are smoothly connected; restrict the derivatives on the durface here
				if (abs(a[2] - b[2]) > 50 || abs(a[2] - c[2]) > 50 || abs(a[2] - d[2]) > 50) {
					continue;
				}

				// Too high in the air (2m)
				if (a[1] > max_ceiling || b[1] > max_ceiling || c[1] > max_ceiling || d[1] > max_ceiling) {
					continue;
				}
				// Ground (2cm)
				if (a[1] < 20 || b[1] < 50 || c[1] < 20 || d[1] < 20) {
					continue;
				}
				// We have a valid quad!
				n_quad += 1;

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

				face_count += 2;

				quad_idx += 6;

			} // for i

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

		// post a message of the elements
		// 4 bytes, 3 vertices
		return {
			idx: index.subarray(0, 6 * n_quad),
			pos: positions.subarray(0, 3 * n_el),
			col: colors.subarray(0, 3 * n_el),
			n_el: n_el,
			n_quad: n_quad,
			quad_offsets: quad_offsets
		};
	};

	/*
	// Camera clicking
	Transform.head_look = function (coord) {
		var ang_url = rest_root + '/m/hcm/motion/headangle';
		// Head look
		var h_fov = 60;
		var v_fov = 40; //30;//60;
		// Make the change in angle coordinates
		var dx = (0.5 - coord.ndx) * h_fov * DEG_TO_RAD;
		var dy = (0.5 - coord.ndy) * v_fov * DEG_TO_RAD;
		// Send the delta
		qwest.post(ang_url, {
			delta: JSON.stringify([dx, dy])
		});
		//
		console.log('Head Look Delta', dx / Math.PI * 180, dy / Math.PI * 180);
	}

	Transform.head_intersect = function (coord) {
		var projector = new THREE.Projector(),
			raycaster = projector.pickingRay(new THREE.Vector3(coord.ndx, coord.ndy), Robot.head_camera),
			// intersect the plane
			intersections = raycaster.intersectObjects(World.items.concat(World.meshes)),
			p,
			r;
		window.console.log('Camera Intersection', intersections);
		if (intersections.length > 0) {
			// only give the first intersection point
			p = intersections[0].point;
			// get the robot point
			r = three_to_torso(p, Robot);
			// apply the callback
			World.intersection_callback(p, r);
		}
	}
	*/

	// x, y, z in the torso (upper body) frame
	// robot: pose (px,py,pa element) and bodyTilt elements
	/*
	Transform.torso_to_three = function(x, y, z, robot) {
		robot = robot || {
			bodyTilt: 3 * Math.PI / 180,
			bodyHeight: 0.93
		};
		// Place into global pose
		var pa = robot.pa,
			ca = cos(pa),
			sa = sin(pa),
			// THREE coords
			tx = robot.px + ca * x - sa * y,
			ty = robot.py + sa * x + ca * y,
			tz = z + robot.bodyHeight;
		//var ta = mod_angle(a-pa);
		// Return in mm, since THREEjs uses that
		// Also, swap the coordinates
		return [ty * 1000, tz * 1000, tx * 1000];
	}
	*/

	/*
	// get a global (THREEjs) point, and put it in the torso reference frame
	Transform.three_to_torso = function(p, robot) {
		robot = robot || {
			bodyTilt: 3 * Math.PI / 180,
			bodyHeight: 0.93
		};
		// Scale the point
		var x = p.z / 1000,
			y = p.x / 1000,
			z = p.y / 1000,
			// Make a relative pose
			pa = robot.pa,
			ca = cos(pa),
			sa = sin(pa),
			px = x - robot.px,
			py = y - robot.py;
		x = ca * px + sa * py;
		y = -sa * px + ca * py;
		// kill off some body transformations
		//x -= robot.supportX;
		z -= robot.bodyHeight;

    // Invert bodyTilt
    //var bodyTilt = -1*robot.bodyTilt;
    //var cp = cos(bodyTilt);
    //var sp = sin(bodyTilt);
    //var xx =  cp*x + sp*z;
    //var zz = -sp*x + cp*z;
    // Yield the torso coordinates

		return [x, y, z];
	}
	*/

	/*
	Transform.mod_angle = function(a) {
		// Reduce angle to [-pi, pi)
		var b = a % (2 * Math.PI);
		return (b >= Math.PI) ? (b - 2 * Math.PI) : b;
	}
	*/

	/*
	function get_hokuyo_head_xyz(u, v, w, width, height, near, far, hFOV, vFOV, pitch) {
		// do not use saturated pixels
		if (w === 0 || w === 255) {
			return;
		}
		//console.log(u,v,w,width,height,near,far,hFOV,vFOV);
		// radians per pixel
		var h_rpp = hFOV / width,
			v_rpp = vFOV / height,
			// angle in radians of the selected pixel
			h_angle = h_rpp * (width / 2 - u),
			v_angle = v_rpp * (v - height / 2),
			// Convert w of 0-255 to actual meters value
			factor = (far - near) / 255,
			r = factor * w + near,
			dx = r * cos(h_angle),
			//
			x = dx * cos(h_angle) + sin(v_angle) * neck_off_axis,
			y = r * sin(h_angle),
			z = -dx * sin(h_angle) + cos(v_angle) * neck_off_axis + neck_height,
			// rotate for pitch compensation
			cp = cos(pitch),
			sp = sin(pitch),
			xx = cp * x + sp * z,
			zz = -sp * x + cp * z;

		// return the global point vector
		return [xx, y, zz, r];
	}
	*/

	/*
	// convert location
	function get_kinect_xyz(u, v, w, width, height, near, far, hFOV, vFOV) {
		// Convert w of 0-255 to actual meters value
		var factor = (far - near) / 255,
			x = factor * w + near,
			y = Math.tan(hFOV / 2) * 2 * (u / width - 0.5) * x,
			z = Math.tan(vFOV / 2) * 2 * (0.5 - v / height) * x;
		return [x, y, z, 0];
	}
	*/

	// export
	ctx.Transform = Transform;

}(this));