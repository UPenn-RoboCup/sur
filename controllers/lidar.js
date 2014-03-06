// Once the page is done loading, execute main
this.addEventListener("load", function () {
	"use strict";

	var port = 9015,
		// Access globals
		d3 = this.d3,
		requestAnimationFrame = this.requestAnimationFrame,
		Float32Array = this.Float32Array,
		DEG_TO_RAD = this.DEG_TO_RAD,
		cos = Math.cos,
		sin = Math.sin,
		// Process WebSocket data
		ws = new this.WebSocket('ws://' + this.hostname + ':' + port),
		meta,
		raw,
		anim = false,
		// Add the canvas to the page
		svg = d3.select("body")
			.append("svg")
			.attr("class", "overlay")
			.attr("width", '100%')
			.attr("height", '100%'),
		svg_container = svg[0][0],
		// Add helpers for calculations
		maxRange = 5,
		nlidar = 0,
		resolution,
		fov_half,
		// Transform to the browser frame
		local_group = svg.append("g"),
		adjust_tr = function () {
			var w = svg_container.clientWidth,
				h = svg_container.clientHeight;
			local_group
				.attr("transform", "translate(" + w / 2 + "," + h / 2 + ") scale(" + w / (-2 * maxRange) + "," + h / (2 * maxRange) + ")");
		},
		// Add the path for the lidar returns
		lidar_path = local_group.append("path")
			.attr("stroke", "none")
			.attr("fill", "grey"),
		pathEl = lidar_path[0][0],
		// TODO: Add the Pose marker of the robot
		// Add the callback to update the SVG data
		lidar2svg = function () {
			if (!raw) {
				anim = false;
				return;
			}
			// Process Float32 lidar returns into an svg path
			var r = new Float32Array(raw),
				pathStr = 'M0,0',
				theta,
				range,
				i,
				n;
			for (i = 0, n = r.length; i < n; i = i + 1) {
				range = r[i];
				theta = i * resolution + fov_half;
				pathStr += ' L' + range * sin(theta) + ',' + range * cos(theta);
			}
			pathStr += 'Z';
			// Draw the path
			pathEl.setAttribute('d', pathStr);
			// Reset raw
			raw = null;
			requestAnimationFrame(lidar2svg);
		};

	// Add the resize helper
	adjust_tr();
	this.addEventListener('resize', adjust_tr);

	// Receive the laser scans
	ws.binaryType = "arraybuffer";
	ws.onmessage = function (e) {
		//console.log(e);
		if (typeof e.data === 'string') {
			meta = JSON.parse(e.data);
			if (nlidar !== meta.n) {
				nlidar = meta.n;
				resolution = DEG_TO_RAD * meta.res;
				fov_half = nlidar * resolution / 2;
			}
		} else {
			raw = e.data;
			if (!anim) {
				requestAnimationFrame(lidar2svg);
			}
		}
	};

});
