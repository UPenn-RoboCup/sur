(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		lA_canvas = document.createElement('canvas'),
		lA_ctx = lA_canvas.getContext('2d'),
		img_data = lA_ctx.getImageData(0, 0, lA_canvas.width, lA_canvas.height),
		container,
		feed,
		label_worker;

	function toggle() {
		feed.canvas.classList.toggle('nodisplay');
		lA_canvas.classList.toggle('nodisplay');
	}

	function ask_labelA(obj) {
		if (lA_canvas.width !== obj.w || lA_canvas.height !== obj.h) {
			// Only work with the canvas image data when necessary
			lA_canvas.width = obj.w;
			lA_canvas.height = obj.h;
			img_data = lA_ctx.getImageData(0, 0, lA_canvas.width, lA_canvas.height);
		}
		// Ask the WebWorker for labelA
		obj.data = new window.Uint8Array(obj.data);
		obj.lA_data = img_data;
		label_worker.postMessage(obj, [obj.data.buffer, obj.lA_data.data.buffer]);
	}

	function recv_labelA(e) {
		// Save the transferrable object
		img_data = e.data.lA_data;
		// Paint the image back
		lA_ctx.putImageData(img_data, 0, 0);
	}

	// Add the camera view and append
	d3.html('/view/head_video.html', function (error, view) {
		// Remove landing page elements and add new content
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		// Add the video feed
		d3.json('/streams/camera0', function (error, port) {
  		feed = new ctx.VideoFeed({
        port: port,
        canvas: true,
				extra_cb: function (obj) {
					if (obj.id === 'labelA') {
						ask_labelA(obj);
					}
				}
  		});
			// Show the images on the page
			container = document.getElementById('camera_container');
			container.appendChild(feed.canvas);
			container.appendChild(lA_canvas);
			lA_canvas.classList.toggle('nodisplay');
		});

		// Animate the buttons
		d3.selectAll('button').on('click', function () {
			// 'this' variable is the button node
			//console.log('clicked', this);
			toggle();
		});

		// LabelA WebWorker
		label_worker = new window.Worker("/label_worker.js");
		label_worker.onmessage = recv_labelA;

	});
	// Load the CSS that we need for our app
	util.lcss('/css/video.css');
	util.lcss('/css/gh-buttons.css');
}(this));