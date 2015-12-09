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
			var mesh_obj = {
				id: 'kinect',
				tfL16: metadata.tfL16 || metadata.tr,
				tfG16: metadata.tfG16 || metadata.tr,
				width: metadata.width,
				height: metadata.height,
				rgb: metadata.rgb,
				pixels: metadata.pixels,
				index: new window.Uint16Array(npix * 6),
				positions: new window.Float32Array(npix * 3),
				colors: new window.Float32Array(npix * 3),
				pixdex: new window.Uint32Array(metadata.pixels.buffer),
			}

			depth_worker.postMessage(mesh_obj, [
				mesh_obj.index.buffer,
				mesh_obj.positions.buffer,
				mesh_obj.colors.buffer,
				mesh_obj.pixels.buffer,
				mesh_obj.rgb.buffer
			]);
			metadata = null;
		}

		function process_color(){
			if(!metadata){
				console.log('Color first', rgb_feed.canvas.metadata);
				return;
				//metadata = rgb_feed.canvas.metadata;
			}

			metadata.rgb = rgb_feed.context2d.getImageData(0, 0, rgb_feed.canvas.width, rgb_feed.canvas.height).data;
			if(metadata.pixels){ post_rgbd(); }
		}
		function process_depth() {
			if(!metadata){
				console.log('Depth first', depth_feed.canvas.metadata);
				//return;
				metadata = depth_feed.canvas.metadata;
			}
			metadata.width = depth_feed.canvas.metadata.width;
			metadata.height = depth_feed.canvas.metadata.height;
			metadata.pixels = new window.Float32Array(metadata.data);
			if(metadata.rgb){ post_rgbd(); }
		}

		// Depth Worker for both mesh and kinect
		depth_worker = new window.Worker("/allmesh_worker.js");
		depth_worker.onmessage = function(e){
			callback(e.data);
		};

		depth_feed = new ctx.VideoFeed({
			port: depth_port,
			fr_callback: process_depth,
		});

		rgb_feed = new ctx.VideoFeed({
			port: rgb_port,
			fr_callback: process_color
		});

	}
	ctx.KinectFeed = KinectFeed;
}(this));
