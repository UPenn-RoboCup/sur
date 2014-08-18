(function (ctx) {
	'use strict';
	function VideoFeed(port, cb, options) {
		// Private variables
		var ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port),
			fr_img = new Image(),
			fr_metadata,
			fr_raw,
			fr_img_src,
			fr_canvas,
			fr_ctx;
		options = options || {};
		if (options.canvas) {
			fr_canvas = document.createElement('canvas');
			fr_ctx = fr_canvas.getContext('2d');
		}
		// Set the Image properties
		fr_img.alt = 'No frame received';
		fr_img.onload = function () {
			fr_raw = null;
			// If send to a canvas...
			if (fr_ctx) {
				var w = fr_img.width,
					h = fr_img.height,
					half_w = w / 2,
					half_h = h / 2,
					diff = (h - w) / 2;
				// Draw to canvas
				if (options.cw90) {
					// Clockwise 90 degree rotation
					fr_canvas.setAttribute('width', h);
					fr_canvas.setAttribute('height', w);
					fr_ctx.save();
					fr_ctx.translate(half_w, half_h);
					fr_ctx.rotate(Math.PI / 2);
					half_h += diff;
					half_w += diff;
					fr_ctx.drawImage(fr_img, -half_w, -half_h, w, h);
					fr_ctx.restore();
				} else {
					// Standard render
					fr_canvas.setAttribute('width', w);
					fr_canvas.setAttribute('height', h);
					fr_ctx.drawImage(fr_img, 1, 1, w, h);
				}
				fr_img.src = "";
			}
			// Revoke and remove last reference to the data
			window.URL.revokeObjectURL(fr_img_src);
			// Run the callback
			if (typeof cb === 'function') {
				setTimeout(cb, 0);
			}
		};
		// Setup the WebSocket connection
		ws.binaryType = "blob";
		ws.onmessage = function (e) {
			if (typeof e.data === "string") {
				fr_metadata = JSON.parse(e.data);
				fr_metadata.latency = (e.timeStamp / 1e3) - fr_metadata.t;
				return;
			}
			// Use the size as a checksum for metadata pairing with an incoming image
			if (e.data.size !== fr_metadata.sz || fr_raw) {
				return;
			}
			if (fr_metadata.c === "jpeg" || fr_metadata.c === "png") {
				// Set the MIME type and make URL for image tag
				fr_raw = e.data.slice(0, e.data.size, 'image/' + fr_metadata.c);
				var fr_id = fr_metadata.id,
					fr_meta_tmp = fr_metadata;
				window.requestAnimationFrame(function () {
					fr_img.width = fr_meta_tmp.w;
					fr_img.height = fr_meta_tmp.h;
					fr_img.alt = fr_id;
					fr_img.metadata = fr_meta_tmp;
					fr_img.src = fr_img_src = window.URL.createObjectURL(fr_raw);
				});
			}
		};
		// Exports
		this.img = fr_img;
		this.canvas = fr_canvas;
	}
	ctx.VideoFeed = VideoFeed;
}(this));