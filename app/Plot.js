(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util;

	function Plot(options) {
		options = options || {};

		var width = options.width || 320,
			height = options.height || 240,
			svg = (options.svg || d3.select(document.createElement('svg'))).attr('width', width).attr('height', height),
			n = options.n || 100,
			data = d3.range(n),
			x = d3.scale.linear().domain([0, n - 1]).range([0, width]),
			y = d3.scale.linear().domain([-20, 20]).range([0, height]),
			line = d3.svg.line().x(function (d, i) {
				return x(i);
			}).y(function (d, i) {
				return y(d);
			}),
			color = options.color || 'black',
			plot_group,
			clip,
			path,
			y_axis;
		if (svg.select('g').size() === 0) {
			plot_group = svg.append("g").attr('class', 'plot_group').attr("transform", "translate(80, 0)");
			clip = plot_group.append("defs")
				.append("clipPath")
				.attr("id", "clip")
				.append("rect")
				.attr("width", width)
				.attr("height", height);
			y_axis = plot_group.append("g")
				.attr("class", "y axis")
				.call(d3.svg.axis().scale(y).orient("left"));
		} else {
			plot_group = svg.select('.plot_group');
		}
		path = plot_group
			.append("path")
			.attr("class", "line")
			.datum(data)
			.attr("clip-path", "url(#clip)")
			.attr("d", line)
			.style("stroke", color);

		this.update = function (datapoint) {
			// https://gist.github.com/mbostock/1642874
			// push a new data point onto the back
			data.push(datapoint);
			path.attr("d", line);
			data.shift();
		};
		this.resize = function (width, height) {
			svg.attr('width', width).attr('height', height);
			x.range([0, width]);
			y.range([0, height]);
			if (clip !== undefined) {
				plot_group.attr("width", width).attr("height", height);
				clip.attr('width', width).attr('height', height);
				y_axis.call(d3.svg.axis().scale(y).orient("left"));
			}
		};
		this.svg = svg;
	}

	// TODO: Add resize handler

	ctx.Plot = Plot;

}(this));
