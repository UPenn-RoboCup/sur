(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util;
	// Add the camera view and append
	d3.html('/hand_video.html', function (error, view) {
		document.body.appendChild(view);
		d3.json('/streams/camera1', function (error, port) {
			document.getElementById('camera_container').appendChild((new ctx.VideoFeed(port)).img);
		});
		// Animate the buttons
		d3.selectAll('button').on('click', function () {
			// 'this' variable is the button node
		});
	});
	// Load the CSS that we need for our app
	util.lcss('/css/cameras.css');
	util.lcss('/css/gh-buttons.css');
	console.log('Loading hands...');
}(this));