(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		depth_canvas = document.createElement('canvas'),
		depth_ctx = depth_canvas.getContext('2d'),
		depth_img_data,
		lA_canvas = document.createElement('canvas'),
		lA_ctx = lA_canvas.getContext('2d'),
		lA_img_data,
		rgb_canvas,
		rgb_feed,
		fr_metadata,
		depth_worker,
		label_worker,
		toggle_id = 0,
		processing = false;

	// Constant for the Kinect2
	//depth_canvas.width = 512;
	//depth_canvas.height = 424;
	// Webots
	depth_canvas.width = 256;
	depth_canvas.height = 212;
	depth_img_data = depth_ctx.getImageData(0, 0, depth_canvas.width, depth_canvas.height);

	function toggle() {
		toggle_id += 1;
		if (toggle_id > 2) {
			toggle_id = 0;
		}
		switch (toggle_id) {
		case 0:
			rgb_canvas.classList.remove('nodisplay');
			depth_canvas.classList.add('nodisplay');
			lA_canvas.classList.add('nodisplay');
			break;
		case 1:
			rgb_canvas.classList.add('nodisplay');
			depth_canvas.classList.remove('nodisplay');
			lA_canvas.classList.add('nodisplay');
			break;
		case 2:
			rgb_canvas.classList.add('nodisplay');
			depth_canvas.classList.add('nodisplay');
			lA_canvas.classList.remove('nodisplay');
			break;
		default:
			rgb_canvas.classList.remove('nodisplay');
			depth_canvas.classList.add('nodisplay');
			lA_canvas.classList.add('nodisplay');
			break;
		}

	}

	function ask_labelA(obj) {
		if (lA_canvas.width !== obj.w || lA_canvas.height !== obj.h) {
			// Only work with the canvas image data when necessary
			lA_canvas.width = obj.w;
			lA_canvas.height = obj.h;
			lA_img_data = lA_ctx.getImageData(0, 0, lA_canvas.width, lA_canvas.height);
		}
		// Ask the WebWorker for labelA
		obj.data = new window.Uint8Array(obj.data);
		obj.lA_data = lA_img_data;
		label_worker.postMessage(obj, [obj.data.buffer, obj.lA_data.data.buffer]);
	}

	function recv_labelA(e) {
		// Save the transferrable object
		lA_img_data = e.data.lA_data;
		// Paint the image back
		lA_ctx.putImageData(lA_img_data, 0, 0);
	}

	function procDepth(e) {
		if (typeof e.data === 'string') {
			fr_metadata = JSON.parse(e.data);
			if (fr_metadata.t !== undefined) {
				// Add latency measure if possible
				fr_metadata.latency = (e.timeStamp / 1e3) - fr_metadata.t;
			}
		} else if (!processing) {
			fr_metadata.data = new window.Float32Array(e.data);
			fr_metadata.depth_data = depth_img_data;
			processing = true;
			depth_worker.postMessage(fr_metadata, [fr_metadata.data.buffer, fr_metadata.depth_data.data.buffer]);
		}
	}

	function recv_depth(e) {
		// Save the transferrable object
		depth_img_data = e.data.depth_data;
		// Paint the image back
		depth_ctx.putImageData(depth_img_data, 0, 0);
		processing = false;
		//window.console.log(e.data.data);
	}

	// Add the camera view and append
	d3.html('/view/kinect2_video.html', function (error, view) {
		// Remove landing page elements and add new content
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		// Depth
		depth_worker = new window.Worker("/depth_worker.js");
		depth_worker.onmessage = recv_depth;
		// LabelA WebWorker
		label_worker = new window.Worker("/label_worker.js");
		label_worker.onmessage = recv_labelA;
		// Add the video rgb_feed
		d3.json('/streams/kinect2_color', function (error, port) {
			rgb_feed = new ctx.VideoFeed({
				id: 'kinect2_color',
				port: port,
				extra_cb: function (obj) {
					if (obj.id === 'labelA') {
						ask_labelA(obj);
					}
				}
			});
			rgb_canvas = rgb_feed.canvas;
			// Show the images on the page
			document.getElementById('camera_container').appendChild(rgb_canvas);
			document.getElementById('camera_container').appendChild(lA_canvas);
			depth_canvas.classList.add('nodisplay');
			lA_canvas.classList.add('nodisplay');
		});
		// Add the depth rgb_feed
		d3.json('/streams/kinect2_depth', function (error, port) {
			var depth_ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port),
				fr_metadata;
			depth_ws.binaryType = 'arraybuffer';
			depth_ws.onmessage = procDepth;
			document.getElementById('camera_container').appendChild(depth_canvas);
		});

		// Animate the buttons
		d3.selectAll('button').on('click', function () {
			// 'this' variable is the button node
			//console.log('clicked', this);
			toggle();
		});

	});
	// Load the CSS that we need for our app
	util.lcss('/css/video.css');
	util.lcss('/css/gh-buttons.css');
}(this));