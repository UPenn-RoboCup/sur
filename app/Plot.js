(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util;

	function Plot(options) {
		options = options || {};
		var svg = d3.select(options.svg || document.createElement('svg')),
			width = svg.attr('width'),
			height = svg.attr('height'),
			n = options.n || 100,
			data = d3.range(n),
			x = d3.scale.linear().domain([0, n - 1]).range([0, width]),
			y = d3.scale.linear().domain([-20, 20]).range([0, height]),
			line = d3.svg.line().x(function (d, i) {
				return x(i);
			}).y(function (d, i) {
				return y(d);
			}),
			plot_group = svg.append("g").attr("transform", "translate(80, 10)"),
			clip,
			path;
		clip = plot_group.append("defs")
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

		this.update = function (datapoint) {
			// https://gist.github.com/mbostock/1642874
			// push a new data point onto the back
			data.push(datapoint);
			// redraw the line, and then slide it to the left
			path.attr("d", line);
			data.shift();
		};
		this.resize = function (width, height) {
			svg.attr('width', width).attr('height', height);
			clip.attr('width', width).attr('height', height);
			plot_group.attr("width", width).attr("height", height);
			x.range([0, width]);
			y.range([0, height]);
		};
		this.svg = svg;
		window.console.log(width, height);
	}

	// TODO: Add resize handler

	ctx.Plot = Plot;

}(this));
