(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		min = Math.min,
		max = Math.max,
		feed;

	/* The Mesh Video feed should display in the JET colormap */
	function to_jet() {
		var ctx = feed.context2d,
			metadata = feed.canvas.metadata,
			range = 255.0;

		if(metadata.c==='raw'){
			metadata.data = new window.Float32Array(metadata.data);
			feed.canvas.width = metadata.dim[1];
			feed.canvas.height = metadata.dim[0];
			range = 8.0;
		}

		var data = metadata.data,
			dlen = data.length,
			imgdata = ctx.getImageData(0, 0, feed.canvas.width, feed.canvas.height),
			idata = imgdata.data,
			len = idata.length,
			fourValue,
			i = 0,
			datum;

		//console.log(metadata.data);
		var w = feed.canvas.width,
			h = feed.canvas.height;
		for(var u = 0; u<w; u+=1){
			for(var v = 0; v<h; v+=1){
				datum = data[u*h + v];
				//datum = data[v*w + u];
				fourValue = 4 - 4 * max(0, min(datum / range, 1));
				idata[i] = 255 * min(fourValue - 1.5, 4.5 - fourValue);
				idata[i + 1] = 255 * min(fourValue - 0.5, 3.5 - fourValue);
				idata[i + 2] = 255 * min(fourValue + 0.5, 2.5 - fourValue);
				idata[i + 3] = 255;
				i += 4;
			}
		}

		ctx.putImageData(imgdata, 0, 0);

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
