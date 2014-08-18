(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		feed;
	// Add the camera view and append
	d3.html('/view/head_video.html', function (error, view) {
		// Remove landing page elements and add new content
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		// Add the video feed
		d3.json('/streams/mesh', function (error, port) {
			/*
			feed = new ctx.VideoFeed(port);
			document.getElementById('camera_container').appendChild(feed.img);
			*/
			feed = new ctx.VideoFeed(port, null, {canvas: true, cw90: true});
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