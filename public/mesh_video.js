(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		min = Math.min,
		feed;

	/* The Mesh Video feed should display in the JET colormap */
	function to_jet() {
		var ctx = feed.context2d,
			imageData = ctx.getImageData(0, 0, feed.canvas.width, feed.canvas.height),
			data = imageData.data,
			len = data.length,
			fourValue,
			i;
		for (i = 0; i < len; i += 4) {
			fourValue = 4 - (4 * data[i]) / 255;
			data[i] = 255 * min(fourValue - 1.5, 4.5 - fourValue);
			data[i + 1] = 255 * min(fourValue - 0.5, 3.5 - fourValue);
			data[i + 2] = 255 * min(fourValue + 0.5, 2.5 - fourValue);
		}
		ctx.putImageData(imageData, 0, 0);
	}

	// Add the camera view and append
	d3.html('/view/head_video.html', function (error, view) {
		// Remove landing page elements and add new content
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		// Add the video feed. There is a 90 degree offset for the chest mesh
		d3.json('/streams/mesh', function (error, port) {
			feed = new ctx.VideoFeed(port, to_jet, {
				cw90: true
			});
			document.getElementById('camera_container').appendChild(feed.canvas);
		});
		// Animate the buttons
		d3.selectAll('button').on('click', function () {
			// 'this' variable is the button node
		});
	});
	// Load the CSS that we need for our app
	util.lcss('/css/gh-buttons.css');
	util.lcss('/css/cameras.css');
}(this));