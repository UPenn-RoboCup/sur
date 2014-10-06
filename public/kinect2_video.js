(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		depth_canvas = document.createElement('canvas'),
		depth_ctx = depth_canvas.getContext('2d'),
		img_data,
		container,
		feed,
		depth_worker,
		processing = false;

	// Constant for the Kinect2
	depth_canvas.width = 512;
	depth_canvas.height = 424;
	img_data = depth_ctx.getImageData(0, 0, depth_canvas.width, depth_canvas.height);

	function toggle() {
		feed.canvas.classList.toggle('nodisplay');
		depth_canvas.classList.toggle('nodisplay');
	}

	function recv_depth(e) {
		//window.console.log(e);
		// Save the transferrable object
		img_data = e.data.depth_data;
		// Paint the image back
		depth_ctx.putImageData(img_data, 0, 0);
		//window.console.log(img_data.data);
		processing = false;
	}

	// Add the camera view and append
	d3.html('/view/kinect2_video.html', function (error, view) {
		// Remove landing page elements and add new content
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		// Add the video feed
		d3.json('/streams/kinect2_color', function (error, port) {
			feed = new ctx.VideoFeed({
				id: 'kinect2_color',
				port: port
			});
			// Show the images on the page
			container = document.getElementById('camera_container');
			container.appendChild(feed.canvas);
			depth_canvas.classList.toggle('nodisplay');
		});
		// Add the depth feed
		d3.json('/streams/kinect2_depth', function (error, port) {
			container.appendChild(depth_canvas);
			var depth_ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port),
				fr_metadata;
			depth_ws.binaryType = 'arraybuffer';
			depth_ws.onmessage = function (e) {
				if (typeof e.data === "string") {
					fr_metadata = JSON.parse(e.data);
					if (fr_metadata.t !== undefined) {
						// Add latency measure if possible
						fr_metadata.latency = (e.timeStamp / 1e3) - fr_metadata.t;
					}
				} else {
					if (!processing) {
						fr_metadata.data = new window.Float32Array(e.data);
						fr_metadata.depth_data = img_data;
						processing = true;
						depth_worker.postMessage(fr_metadata, [fr_metadata.data.buffer, fr_metadata.depth_data.data.buffer]);
					}
				}
			};
		});

		// Animate the buttons
		d3.selectAll('button').on('click', function () {
			// 'this' variable is the button node
			//console.log('clicked', this);
			toggle();
		});

		// LabelA WebWorker
		depth_worker = new window.Worker("/depth_worker.js");
		depth_worker.onmessage = recv_depth;

	});
	// Load the CSS that we need for our app
	util.lcss('/css/video.css');
	util.lcss('/css/gh-buttons.css');
}(this));
