function Video(port) {
	'use strict';
	var ws = new window.WebSocket('ws://' + window.hostname + ':' + port),// Connect to the websocket server
		fr_sz_checksum,
		fr_metadata,
		raw,
		img_src,
		camera_img = new Image(),
		is_rendering = false,
		anim = false;
	
	function on_img_loaded() {
		// Revoke
		window.URL.revokeObjectURL(img_src);
		// Remove last reference to the data
		raw = null;
		is_rendering = false;
	}
	
	// Render the image
	function frame2img() {
		if (!raw || is_rendering) {
			anim = false;
			return;
		}
		// Decompress image via browser
		img_src = window.URL.createObjectURL(raw);
		camera_img.src = img_src;
		is_rendering = true;
		// Trigger processing once the image is fully loaded
		window.requestAnimationFrame(frame2img);
	}
	
	// Setup the WebSocket
	ws.binaryType = "blob";
	ws.onmessage = function (e) {
		if (typeof e.data === "string") {
			fr_metadata = JSON.parse(e.data);
			// latency in seconds
			var latency = (e.timeStamp / 1e3) - fr_metadata.t;
			fr_sz_checksum = fr_metadata.sz;
			//window.console.log('Camera', fr_sz_checksum, latency);
			return;
		}
		/* Use the size as a sort of checksum
			for metadata pairing with an incoming image */
		if (e.data.size !== fr_sz_checksum) {
			window.console.log('Camera Checksum fail!', fr_metadata.sz, fr_sz_checksum);
			return;
		}
		if (is_rendering) {
			//window.console.log('Rendering previous...');
			return;
		}
		// Save the last received image, for delayed rendering
		raw = e.data;
		// Perform a render
		if (!anim) {
			window.requestAnimationFrame(frame2img);
		}
	};
	
	// Set the camera properties
	camera_img.alt = 'No image yet...';
	camera_img.onload = on_img_loaded;
	
	// Exports
	this.img = camera_img;
	
}