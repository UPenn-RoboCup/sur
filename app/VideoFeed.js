(function (ctx) {
	'use strict';

	function VideoFeed(options) {
    options = options || {};
		// Private variables
		var port = options.port,
      ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port),
      cb = options.fr_callback,
      extra_cb = options.extra_cb,
			fr_img = new Image(),
			fr_canvas = document.createElement('canvas'),
			fr_ctx = fr_canvas.getContext('2d'),
			createObjectURL = window.URL.createObjectURL,
			revokeObjectURL = window.URL.revokeObjectURL,
			frames = [],
			fr_metadata,
			fr_raw,
			fr_img_src;

		function animate() {
			var fr = frames.shift();
			fr_img.src = fr_img_src = createObjectURL(fr.data);
			fr_canvas.metadata = fr;
			if (frames.length > 0) {
				window.console.log('VideoFeed: Too many frames!', frames);
			}
		}

		// Set the Image properties
		fr_img.alt = 'VideoFeed WS: ' + port;
		fr_img.onload = function () {
			var w = fr_img.width,
				h = fr_img.height,
				half_w = w / 2,
				half_h = h / 2,
				diff = (h - w) / 2;
			// Draw to canvas
			if (options.cw90) {
				// Clockwise 90 degree rotation
				fr_canvas.width = h;
				fr_canvas.height = w;
				fr_ctx.save();
				fr_ctx.translate(half_w, half_h);
				fr_ctx.rotate(Math.PI / 2);
				half_h += diff;
				half_w += diff;
				fr_ctx.drawImage(fr_img, -half_w, -half_h, w, h);
				fr_ctx.restore();
			} else {
				// Standard render
				fr_canvas.width = w;
				fr_canvas.height = h;
				fr_ctx.drawImage(fr_img, 0, 0, w, h);
			}
			// Remove data references
			fr_raw = null;
			fr_img.src = '';
			revokeObjectURL(fr_img_src);
			// Run the callback on the next JS loop
			if (typeof cb === 'function') {
				setTimeout(cb, 0);
			}
			// Keep de-queueing if necessary, even if not just animation frames
			if (frames.length > 0) {
				animate();
			}
		};
		// Setup the WebSocket connection
		ws.onmessage = function (e) {
			if (typeof e.data === "string") {
				// Process metadata
				fr_metadata = JSON.parse(e.data);
				if (fr_metadata.t !== undefined) {
					// Add latency measure if possible
					fr_metadata.latency = (e.timeStamp / 1e3) - fr_metadata.t;
				}
				if (fr_metadata.c === "jpeg" || fr_metadata.c === "png") {
					// Image raw data is rendered as image via Blob
					ws.binaryType = 'blob';
				} else if (fr_metadata.sz) {
					// Non-image raw data is arraybuffer
					ws.binaryType = 'arraybuffer';
				} else if (typeof extra_cb === 'function') {
					// Run callback if no raw data coming
					extra_cb(fr_metadata);
				}
			} else if (fr_metadata.c === "jpeg" || fr_metadata.c === "png") {
				// Process the Blob of the VideoFeed data
				if (e.data.size !== fr_metadata.sz || fr_raw) {
					return;
				}
				// Set the MIME type and make URL for image tag
				fr_metadata.data = e.data.slice(0, e.data.size, 'image/' + fr_metadata.c);
				frames.push(fr_metadata);
				window.requestAnimationFrame(animate);
			} else if (typeof extra_cb === 'function') {
				// Run the callback on non video data
				fr_metadata.data = e.data;
				extra_cb(fr_metadata);
			}
		};
		// Exports
		this.canvas = fr_canvas;
		this.context2d = fr_ctx;
	}
	ctx.VideoFeed = VideoFeed;
}(this));