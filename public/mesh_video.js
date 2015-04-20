(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		min = Math.min,
		feed;

	/* The Mesh Video feed should display in the JET colormap */
	function to_jet() {
		var ctx = feed.context2d,
			metadata = feed.canvas.metadata,
			img_data = ctx.getImageData(0, 0, feed.canvas.width, feed.canvas.height),
			data = img_data.data,
			len = data.length,
			fourValue,
			i;
		for (i = 0; i < len; i += 4) {
			fourValue = 4 - (4 * data[i]) / 255;
			data[i] = 255 * min(fourValue - 1.5, 4.5 - fourValue);
			data[i + 1] = 255 * min(fourValue - 0.5, 3.5 - fourValue);
			data[i + 2] = 255 * min(fourValue + 0.5, 2.5 - fourValue);
		}
		ctx.putImageData(img_data, 0, 0);
		window.console.log(metadata);
	}

	// Add the camera view and append
	d3.html('/view/mesh_video.html', function (error, view) {
		// Remove landing page elements and add new content
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		// Add the video feed. There is a 90 degree offset for the chest mesh
		util.ljs("/VideoFeed.js",function(){
			d3.json('/streams/mesh0', function (error, port) {
				feed = new ctx.VideoFeed({
					port: port,
					fr_callback: to_jet,
					cw90: true
				});
				document.getElementById('camera_container').appendChild(feed.canvas);
			});
		});
		// Animate the buttons
		d3.selectAll('button').on('click', function () {
			// 'this' variable is the button node
		});
	});
	// Load the CSS that we need for our app
	util.lcss('/css/gh-buttons.css');
	util.lcss('/css/video.css');
}(this));
