// Once the page is done loading, execute main
this.addEventListener("load", function () {
	"use strict";

	// Add the canvas to the page
	var port = 9015,
		ws = new WebSocket('ws://' + host + ':' + port),
		svg = d3.select("body")
			.append("svg")
			.attr("class", "overlay")
			.attr("width", '100%')
			.attr("height", '100%'),
		svg_container = svg[0][0],
		w = svg_container.clientWidth,
		h = svg_container.clientHeight,
		h2 = h / 2,
		w2 = w / 2,
		lidar_path = svg.append("path")
			.attr("stroke", "blue")
			.attr("stroke-width", 2)
			.attr("fill", "none"),
		pose_symbol = d3.svg
			.symbol()
			.type('triangle-up'),
		pose_marker = svg.append("path")
			.attr("transform", "translate(" + w2 + "," + h2 + ")")
			.attr("d", pose_symbol)
			.style("fill", "red"),
		lineFunction = d3.svg.line() // Line of ranges
			.interpolate("linear-closed"),
		maxRange = 30,
		metadata,
		returnsData,
		lineData = [],
		lidar2svg = function (meta, r) {
			var half_fov = meta.n * meta.res * DEG_TO_RAD / 2,
				factor = -1 * DEG_TO_RAD * meta.res,
				w_factor = -1 * w2 / maxRange,
				h_factor = -1 * h2 / maxRange,
				theta,
				range,
				dx, // Robot frame
				dy, // Robot frame
				i;
			// Form the browser coordinate line data
			for (i = 0; i < r.length; i = i + 1) {
				theta = i * factor + half_fov;
				range = r[i];
				dx = range * Math.cos(theta);
				dy = range * Math.sin(theta);
				lineData[i] = [
					w2 + w_factor * dy, // Browser frame x
					h2 + h_factor * dx  // Browser frame y
				];
			}
			lineData[i] = [ w2, h2 ];
			// Draw the path
			lidar_path.attr("d", lineFunction(lineData));
		};

	// Resize helper
	window.addEventListener('resize', function () {
		w = svg_container.clientWidth;
		h = svg_container.clientHeight;
		h2 = h / 2;
		w2 = w / 2;
		pose_marker.attr("transform", "translate(" + w2 + "," + h2 + ")");
	});

	// Receive the laser scans
	ws.binaryType = "arraybuffer";
	ws.onmessage = function (e) {
		//console.log(e);
		if (typeof e.data === 'string') {
			metadata = JSON.parse(e.data);
			return;
		}
		// Parse the lidar information as Float32
		returnsData = new Float32Array(e.data);
		// Process into an svg path
		lidar2svg(metadata, returnsData);
	};

});
