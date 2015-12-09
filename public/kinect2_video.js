(function (ctx) {
	'use strict';
	var util = ctx.util,
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
		processing = false,
		overlay,
		valve_colors = ['cyan', 'magenta', 'yellow'];

	// Constant for the Kinect2
	//depth_canvas.width = 512;
	//depth_canvas.height = 424;
	// Webots
	//depth_canvas.width = 256;
	//depth_canvas.height = 212;
	// Kinect v1
	depth_canvas.width = 320;
	depth_canvas.height = 240;
	depth_img_data = depth_ctx.getImageData(0, 0, depth_canvas.width, depth_canvas.height);

	function toggle() {
		switch (toggle_id) {
		case 0:
			rgb_canvas.classList.remove('nodisplay');
			depth_canvas.classList.add('nodisplay');
			lA_canvas.classList.add('nodisplay');
      toggle_id = 1;
			break;
		case 1:
			rgb_canvas.classList.add('nodisplay');
			depth_canvas.classList.remove('nodisplay');
			lA_canvas.classList.add('nodisplay');
      toggle_id = 0;
			break;
		case 2:
			rgb_canvas.classList.add('nodisplay');
			depth_canvas.classList.add('nodisplay');
			lA_canvas.classList.remove('nodisplay');
      toggle_id = 0;
			break;
		default:
			rgb_canvas.classList.remove('nodisplay');
			depth_canvas.classList.add('nodisplay');
			lA_canvas.classList.add('nodisplay');
      toggle_id = 0;
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
			//console.log(fr_metadata);
			if(fr_metadata.id==='k_depth'){
				fr_metadata.data = new window.Uint16Array(e.data);
			} else {
				fr_metadata.data = new window.Float32Array(e.data);
			}
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

	util.lhtml('/view/kinect2_video.html').then(function(view) {
		document.body = view;
		return Promise.all([
			util.ljs("/bc/d3/d3.js"),
			util.ljs("/VideoFeed.js")
		]);
	}).then(function(){
		// Depth
		depth_worker = new window.Worker("/depth_worker.js");
		depth_worker.onmessage = recv_depth;
		// LabelA WebWorker
		label_worker = new window.Worker("/label_worker.js");
		label_worker.onmessage = recv_labelA;
		// Grab the color port
		return util.shm('/streams/kinect2_color');
	}).then(function(port){
		// Add the video rgb_feed
		rgb_feed = new ctx.VideoFeed({
			id: 'kinect2_color',
			port: port,
			extra_cb: function (obj) {
				if (obj.id === 'labelA') {
					ask_labelA(obj);
				} else if (obj.id === 'detect') {

				}
			}
		});
		rgb_canvas = rgb_feed.canvas;
		// Show the images on the page
		document.getElementById('camera_container').appendChild(rgb_canvas);
		document.getElementById('camera_container').appendChild(lA_canvas);
		depth_canvas.classList.add('nodisplay');
		lA_canvas.classList.add('nodisplay');

		// Grab the color port
		return util.shm('/streams/kinect2_depth');
	}).then(function(port){
		// Add the depth_feed
		var depth_ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port),
			fr_metadata;
		depth_ws.binaryType = 'arraybuffer';
		depth_ws.onmessage = procDepth;
		document.getElementById('camera_container').appendChild(depth_canvas);
	}).then(function(){
		// Add the overlay
		overlay = d3.select("#camera_container").append("svg").attr('class', 'overlay')
			.attr('viewBox', "0 0 256 212").attr('preserveAspectRatio', "none")
			.attr('width', depth_canvas.width).attr('height', depth_canvas.height);
		overlay.append('g').attr('id', 'valves');
		// Animate the buttons
		d3.select('#camera_container').on('click', function () {
			// 'this' variable is the button node
			//console.log('clicked', this);
			toggle();
		});
	});
	// Load the CSS that we need for our app
	util.lcss('/css/fullvideo.css');
	util.lcss('/css/overlay.css');
	util.lcss('/css/gh-buttons.css');
}(this));
