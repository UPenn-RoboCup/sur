(function (ctx) {
	'use strict';
	var util = ctx.util,
		lA_canvas = document.createElement('canvas'),
		lA_ctx = lA_canvas.getContext('2d'),
		lA_img_data,
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

	// Add the camera view and append
	util.lhtml('/view/head_video.html').then(function(view) {
		document.body = view;
		return util.ljs('/VideoFeed.js');
	}).then(function(){
		return util.shm('/streams/camera0');
	}).then(function(port){
		feed = new ctx.VideoFeed({
			port: port,
			extra_cb: function (obj) {
				if (obj.id === 'labelA') { ask_labelA(obj); }
			}
		});
	}).then(function(){
		// Show the images on the page
		var container = document.getElementById('camera_container');
		container.appendChild(feed.canvas);
		container.appendChild(lA_canvas);
		lA_canvas.classList.toggle('nodisplay');
		container.addEventListener('dblclick', toggle);
	});

	// LabelA WebWorker
	label_worker = new Worker("/label_worker.js");
	label_worker.onmessage = recv_labelA;
	// Load the CSS that we need for our app
	util.lcss('/css/video.css');
	util.lcss('/css/gh-buttons.css');
}(this));
