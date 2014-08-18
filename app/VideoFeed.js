(function (ctx) {
	'use strict';

	function VideoFeed(port, cb, options) {
		// Private variables
		var ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port),
			fr_img = new Image(),
			fr_canvas = document.createElement('canvas'),
			fr_ctx = fr_canvas.getContext('2d'),
			createObjectURL = window.URL.createObjectURL,
			revokeObjectURL = window.URL.revokeObjectURL,
			zInflate = ctx.pako.inflate,
			zData,
			fr_metadata,
			fr_raw,
			fr_img_src;
		options = options || {};

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
		};
		// Setup the WebSocket connection
		ws.onmessage = function (e) {
			if (typeof e.data === "string") {
				fr_metadata = JSON.parse(e.data);
				// Set binary type for next raw data
				if (fr_metadata.c === "jpeg" || fr_metadata.c === "png") {
					ws.binaryType = 'blob';
				} else {
					ws.binaryType = 'arraybuffer';
				}
				fr_metadata.latency = (e.timeStamp / 1e3) - fr_metadata.t;
				return;
			}
			if (fr_metadata.c === "jpeg" || fr_metadata.c === "png") {
				if (e.data.size !== fr_metadata.sz || fr_raw) {
					// Chesksum
					return;
				}
				// Set the MIME type and make URL for image tag
				fr_raw = e.data.slice(0, e.data.size, 'image/' + fr_metadata.c);
				var fr_meta_tmp = fr_metadata;
				window.requestAnimationFrame(function () {
					fr_img.src = fr_img_src = createObjectURL(fr_raw);
					fr_canvas.metadata = fr_meta_tmp;
				});
			} else if (fr_metadata.c === 'zlib') {
				zData = zInflate(new window.Uint8Array(e.data));
			}
		};
		// Exports
		this.canvas = fr_canvas;
		this.context2d = fr_ctx;
	}
	ctx.VideoFeed = VideoFeed;
}(this));