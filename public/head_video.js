(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		lA_canvas = document.createElement('canvas'),
		lA_ctx = lA_canvas.getContext('2d'),
		container,
		feed;
	
	function toggle() {
		feed.canvas.classList.toggle('nodisplay');
		lA_canvas.classList.toggle('nodisplay');
	}

	function form_labelA(meta, payload) {
		lA_canvas.width = meta.w;
		lA_canvas.height = meta.h;
		var i,
			j,
			d = 0,
			lA_data = lA_ctx.getImageData(0, 0, lA_canvas.width, lA_canvas.height),
			data = lA_data.data,
			len = payload.length;
		for (i = 0, j = 0; i < len; i += 1, j += 4) {
			data[j + 3] = 255;
			if (payload[i] & 0x01) {
				// Ball
				data[j] = 255;
				data[j + 1] = 0;
				data[j + 2] = 0;
			} else if (payload[i] & 0x02) {
				// Yellow goalpost
				data[j] = 255;
				data[j + 1] = 255;
				data[j + 2] = 0;
			} else if (payload[i] & 0x04) {
				// Cyan
				data[j] = 0;
				data[j + 1] = 0;
				data[j + 2] = 255;
			} else if (payload[i] & 0x08) {
				// Field
				data[j] = 0;
				data[j + 1] = 255;
				data[j + 2] = 0;
			} else if (payload[i] & 0x10) {
				// Lines
				data[j] = 255;
				data[j + 1] = 255;
				data[j + 2] = 255;
			} else {
				// Unknown
				data[j] = 0;
				data[j + 1] = 0;
				data[j + 2] = 0;
			}
		}
		lA_ctx.putImageData(lA_data, 0, 0);
	}
	// Add the camera view and append
	d3.html('/view/head_video.html', function (error, view) {
		// Remove landing page elements and add new content
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		// Add the video feed
		d3.json('/streams/camera0', function (error, port) {
			feed = new ctx.VideoFeed(port, null, {
				canvas: true,
				extra_cb: function (meta, payload) {
					if (meta.id === 'labelA') {
						form_labelA(meta, payload);
					}
				}
			});
			container = document.getElementById('camera_container');
			container.appendChild(feed.canvas);
			container.appendChild(lA_canvas);
			lA_canvas.classList.toggle('nodisplay');
		});
		
		// Animate the buttons
		d3.selectAll('button').on('click', function () {
			// 'this' variable is the button node
			//console.log('clicked', this);
			toggle();
		});
		
	});
	// Load the CSS that we need for our app
	util.lcss('/css/cameras.css');
	util.lcss('/css/gh-buttons.css');
}(this));