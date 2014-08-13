(function (ctx) {
	'use strict';
	function VideoFeed(port, cb, non_img_cb) {
		// Private variables
		var ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port),
			fr_img = new Image(),
			fr_metadata,
			fr_raw,
			fr_img_src;
		// Set the Image properties
		fr_img.alt = 'No frame received';
		fr_img.onload = function () {
			// Revoke and remove last reference to the data
			window.URL.revokeObjectURL(fr_img_src);
			fr_raw = null;
			// Save the data and run the callback
			// TODO: Bind the image reference?
			fr_img.metadata = fr_metadata;
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
				window.requestAnimationFrame(function () {
					fr_img_src = fr_img.src = window.URL.createObjectURL(fr_raw);
					fr_img.alt = fr_metadata.id;
				});
			} else {
				// Got other stuff on the VideoFeed channel
				if (typeof non_img_cb === 'function') {
					setTimeout(non_img_cb, 0);
				}
			}
		};
		// Exports
		this.img = fr_img;
	}
	ctx.VideoFeed = VideoFeed;
}(this));