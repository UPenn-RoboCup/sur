(function (ctx) {
	'use strict';

	function MeshFeed(port, callback) {

		var depth_worker, video_feed;

		// Process the video frame
		function process_frame() {
			var canvas = video_feed.canvas,
				metadata = canvas.metadata,
				pixels, width, height;
			if(metadata.c === 'raw'){
				//console.log('testing...', metadata.data, metadata.data ? metadata.data.byteLength:null);
				//console.assert(metadata.data, metadata);
				if(!metadata.data || metadata.data.byteLength===0){
					console.log('Bad data', metadata);
					return;
				}
				pixels = new Float32Array(metadata.data);
				width = metadata.dim[1];
				height = metadata.dim[0];
			} else {
				width = canvas.width;
				height = canvas.height;
				pixels = video_feed.context2d.getImageData(0, 0, width, height).data;
			}

			var npix = width * height;

			var mesh_obj = {
					id: metadata.id,
					c: metadata.c,
					sfov: metadata.sfov,
					rfov: metadata.rfov,
					dynrange: metadata.dr,
					//
					a: metadata.a,
					qW: metadata.qW,
					//
					tfL6: metadata.tfL6,
					tfG6: metadata.tfG6,
					tfL16: metadata.tfL16,
					tfG16: metadata.tfG16,
					//
					width: width,
					height: height,
					// Make the max allocations
					// TODO: Can we reuse these?
					index: new Uint16Array(npix * 6),
					positions: new Float32Array(npix * 3),
					colors: new Float32Array(npix * 3),
					pixels: pixels,
					pixdex: new Uint32Array(pixels.buffer),
				};

			// Now process it
			depth_worker.postMessage(mesh_obj, [
				mesh_obj.index.buffer,
				mesh_obj.positions.buffer,
				mesh_obj.colors.buffer,
				mesh_obj.pixels.buffer,
			]);
		}

		// Depth Worker for both mesh and kinect
		depth_worker = new window.Worker("/allmesh_worker.js");
		depth_worker.onmessage = function(e){
			callback(e.data);
		};

		video_feed = new ctx.VideoFeed({
			port: port,
			fr_callback: process_frame,
		});

	}
	ctx.MeshFeed = MeshFeed;
}(this));
