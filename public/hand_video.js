(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		feed;
	// Add the camera view and append
	d3.html('/view/hand_video.html', function (error, view) {
		// Remove landing page elements and add new content
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		// Add the video feed
		d3.json('/streams/camera1', function (error, port) {
  		feed = new ctx.VideoFeed({
        port: port,
  		});
			document.getElementById('camera_container').appendChild(feed.canvas);
		});
		// Animate the buttons
		d3.selectAll('button').on('click', function () {
			// 'this' variable is the button node
		});
	});
	// Load the CSS that we need for our app
	ctx.util.lcss('/css/video.css');
	ctx.util.lcss('/css/gh-buttons.css');
}(this));