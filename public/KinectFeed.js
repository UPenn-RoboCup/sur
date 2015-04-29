(function (ctx) {
	'use strict';

	var createObjectURL = window.URL.createObjectURL,
			revokeObjectURL = window.URL.revokeObjectURL;


	function KinectFeed(rgb_port, depth_port, callback) {

		var depth_worker, depth_feed, rgb_feed, metadata;

		function post_rgbd(){
			// Allocations
			// TODO: Maintain a fixed set of allocations to avoid penalty on each new data
			var npix = metadata.height * metadata.width;
			metadata.index = new window.Uint16Array(npix * 6);
			metadata.positions = new window.Float32Array(npix * 3);
			metadata.colors = new window.Float32Array(npix * 3);
			metadata.pixdex = new window.Uint32Array(metadata.pixels.buffer);
			depth_worker.postMessage(metadata, [
				metadata.index.buffer,
				metadata.positions.buffer,
				metadata.colors.buffer,
				metadata.pixels.buffer,
				metadata.rgb.buffer
			]);
		}

		function process_color(){
			if(!metadata){
				console.log('Color first');
				metadata = rgb_feed.canvas.metadata;
			}
			metadata.rgb = rgb_feed.context2d.getImageData(0, 0, rgb_feed.canvas.width, rgb_feed.canvas.height).data;
			if(metadata.pixels){ post_rgbd(); }
		}
		function process_depth() {
			if(!metadata){
				console.log('Depth first');
				metadata = depth_feed.canvas.metadata;
			}
			metadata.width = depth_feed.canvas.metadata.width;
			metadata.height = depth_feed.canvas.metadata.height;
			metadata.pixels = new window.Float32Array(metadata.data);
			if(metadata.rgb){ post_rgbd(); }
		}

		// Depth Worker for both mesh and kinect
		depth_worker = new window.Worker("/allmesh_worker.js");
		depth_worker.onmessage = callback;

		depth_feed = new ctx.VideoFeed({
			port: rgb_port,
			fr_callback: process_depth,
		});

		rgb_feed = new ctx.VideoFeed({
			port: depth_port,
			fr_callback: process_color
		});

	}
	ctx.KinectFeed = KinectFeed;
}(this));
