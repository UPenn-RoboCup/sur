(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		ws,
		svg,
		path,
		width = 920,
		height = 380,
		plot_group,
		data = d3.range(40),
		n = 40,
		x = d3.scale.linear()
			.domain([0, n - 1])
			.range([0, width]),
		y = d3.scale.linear()
			.domain([-20, 20])
			.range([0, height]),
		line = d3.svg.line().x(function (d, i) {
			return x(i);
		}).y(function (d, i) {
			return y(d);
		});

	function entry() {
		svg = d3.select("body").append("svg");
		plot_group = svg.append("g")
			.attr("transform", "translate(80, 10)");
		plot_group.append("defs")
			.append("clipPath")
			.attr("id", "clip")
			.append("rect")
			.attr("width", width)
			.attr("height", height);
		plot_group.append("g")
			.attr("class", "y axis")
			.call(d3.svg.axis().scale(y).orient("left"));
		path = plot_group
			.append("path")
			.attr("class", "line")
			.datum(data)
			.attr("clip-path", "url(#clip)")
			.attr("d", line);
	}

	function update(e) {
		if (typeof e.data !== "string") {
			return;
		}
		var feedback = JSON.parse(e.data);
		// Pitch hard coded for now
		// https://gist.github.com/mbostock/1642874
		// push a new data point onto the back
		data.push(feedback.gyro[0] * 180 / Math.PI);
		// redraw the line, and then slide it to the left
		path
			.attr("d", line);
			//.attr("transform", null);
			//.transition()
			//.ease("linear")
			//.attr("transform", "translate(" + x(-1) + ")");
		// pop the old data point off the front
		data.shift();
	}

	// Add the camera view and append
	d3.html('/view/body_graph.html', function (error, view) {
		// Remove landing page elements and add new content
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		// Add the video feed. There is a 90 degree offset for the chest mesh
		d3.json('/streams/feedback', function (error, port) {
			ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port);
			//document.getElementById('camera_container').appendChild(feed.canvas);
			ws.onmessage = update;
		});
		// Add the joint selector (TODO: Checkbox?)
		/*
		d3.select("body").append("form").append("SELECT").selectAll('option').data(['head', 'neck']).enter().append("option").text(function (d) {
			return d;
		}).attr("value", function (d) {
			return d;
		});
		*/
		setTimeout(entry);
	});
	// Load the CSS that we need for our app
	util.lcss('/css/gh-buttons.css');
	util.lcss('/css/graph.css');
}(this));
