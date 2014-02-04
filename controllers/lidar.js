// Once the page is done loading, execute main
this.addEventListener("load", function () {
	"use strict";

	// Add the canvas to the page
	var port = 9015,
		ws = new WebSocket('ws://' + host + ':' + port),
		canvas,
		canvasContext2D,
		svg,
		metadata,
		lidar2svg,
		lineFunction,
		svg_container = $('#lidar_container')[0],
		lidar_path,
		w = svg_container.clientWidth,
		h = svg_container.clientHeight;

	/*
	// Canvas setup
	canvas = document.createElement("canvas");
	canvas.width = 640;
	canvas.height = 480;
	canvas.id = 'laser_points';
	// Modify the canvas
	canvasContext2D = canvas.getContext("2d");
	canvasContext2D.fillStyle = "grey";
	canvasContext2D.fillRect(0, 0, canvas.width, canvas.height);
	document.body.appendChild(canvas);
	*/

	// SVG setup
	svg = d3.select("#lidar_container")
		.append("svg")
		.attr("width", '100%')
		.attr("height", '100%');
	lidar_path = svg.append("path");

	//Draw the Circle
	/*
 var circle = svg.append("circle")
                          .attr("cx", 30)
                          .attr("cy", 30)
                         .attr("r", 20);
	*/

	var pose_symbol = d3.svg
		.symbol()
		.type('triangle-up');
	//console.log( d3.svg.symbolTypes );
	var pose_marker = svg.append("path")
		.attr("transform", "translate("+w/2+","+h/2+")")
	 	.attr("d", pose_symbol)
		.style("fill", "red");

	// Receive the laser scans
	ws.binaryType = "arraybuffer";
	ws.onmessage = function (e) {
		//console.log(e);
		if (typeof e.data === 'string') {
			metadata = JSON.parse(e.data);
			return;
		}
		// Parse the lidar information as Float32
		var returns = new Float32Array(e.data);
		// Process into an svg path
		lidar2svg(metadata,returns)
	};

	var lineFunction = d3.svg.line()
		.x(function(d) { return d.x; })
		.y(function(d) { return d.y; })
		.interpolate("linear-closed");

	lidar2svg = function (meta, r) {
		var half_fov = meta.n * meta.res * DEG_TO_RAD / 2,
			factor = -1 * DEG_TO_RAD * meta.res,
			theta,
			range,
			dx, // Robot frame
			dy, // Robot frame
			i,
			lineData = [];

		lineData.push({x:w/2,y:h/2});

		//console.log(svg_container,w,h);

		for (i = 0; i < r.length; i++) {
			theta = i * factor + half_fov;
			range = r[i];
			dx = range * Math.cos( theta );
			dy = range * Math.sin( theta );
			lineData.push({
				x: -dy / 30 * w + w / 2, // Browser frame
				y: -dx / 30 * h + h / 2
			});
			//console.log(x,y);
			//path_seglist.appendItem(path.createSVGPathSegLinetoAbs(xpos, ypos));
		}
		//console.log(lineData);
		var lineGraph = lidar_path
			.attr("d", lineFunction(lineData))
			.attr("stroke", "blue")
			.attr("stroke-width", 2)
			.attr("fill", "none");
		};

	// Resize issues with SVG...?
	window.addEventListener('resize', function () {
		w = svg_container.clientWidth;
		h = svg_container.clientHeight;
	});

});
