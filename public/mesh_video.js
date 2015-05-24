(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		min = Math.min,
		max = Math.max,
		mesh_feed = [];

	/* The Mesh Video feed should display in the JET colormap */
	function to_jet() {
		var feed = mesh_feed[this];
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
	Promise.all([
		util.lcss('/css/all_scene.css'),
		util.lcss('/css/gh-buttons.css'),
		util.ljs("/VideoFeed.js"),
	]).then(function(){
		return util.ljs("/MeshFeed.js");
	}).then(function(){
		return util.lhtml('/view/mesh_video.html');
	}).then(function (view) {
		document.body = view;
		return Promise.all([
			util.shm('/streams/mesh0'),
			util.shm('/streams/mesh1')
		]);
	}).then(function(ports){
		// TODO: cw90...
		mesh_feed[0] = new ctx.VideoFeed({
			port: ports[0],
			fr_callback: to_jet.bind(0),
			cw90: true
		});
		mesh_feed[1] = new ctx.VideoFeed({
			port: ports[1],
			fr_callback: to_jet.bind(1),
			cw90: true
		});
		document.getElementById('camera_container')
			.appendChild(mesh_feed[0].canvas);
	});
}(this));
