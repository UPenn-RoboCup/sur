(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		sprintf = ctx.sprintf;

	function Plot(options) {
		options = options || {};

		var width = options.width || 320,
			height = options.height || 240,
			svg = (options.svg || d3.select(document.createElement('svg'))).attr('width', width).attr('height', height),
			n = options.n || 100,
			data = d3.range(n),
			ts = d3.range(n),
			lower = options.lower || -90,
			upper = options.upper || 90,
			x = d3.scale.linear().domain([0, n - 1]).range([0, width]),
			y = d3.scale.linear().domain([upper, lower]).range([0, height]),
			line = d3.svg.line().x(function (d, i) {
				return x(i);
			}).y(function (d, i) {
				return y(d);
			}),
			color = options.color || 'black',
			plot_group = svg.select('.plot_group'),
			focus_group = svg.select('.focus_group'),
			focus,
			clip,
			path,
			y_axis,
			needs_show = true;

		if (plot_group.size() === 0) {
			y_axis = svg.append("g")
				.attr("class", "y axis")
				.call(d3.svg.axis().scale(y).orient("right"));
			plot_group = svg.append("g").attr('class', 'plot_group');
			clip = plot_group.append("defs")
				.append("clipPath")
				.attr("id", "clip")
				.append("rect")
				.attr("width", width)
				.attr("height", height);
			focus_group = svg.append("g").attr('class', 'focus_group');
			svg.on("mouseover", function (d, i) {
				var xi = Math.round(x.invert(d3.mouse(this)[0])),
					val,
					t;
				focus_group.selectAll('g').each(function (data, i) {
					val = data[xi];
					t = ts[xi];
					//console.log(t, val, this);
					d3.select(this).attr("transform", "translate(" + x(xi) + "," + y(val) + ")").attr("class", "");
					d3.select(this).select("text").text(sprintf('%.2f: %.2f', t, val)).attr("x", xi > data.length / 2 ? -96 : 9);
				});
			}).on("mousemove", function (d, i) {
				var xi = Math.round(x.invert(d3.mouse(this)[0])),
					val,
					t;
				focus_group.selectAll('g').each(function (data, i) {
					val = data[xi];
					t = ts[xi];
					//console.log(t, val, this);
					d3.select(this).attr("transform", "translate(" + x(xi) + "," + y(val) + ")");
					d3.select(this).select("text").text(sprintf('%.2f: %.2f', t, val)).attr("x", xi > data.length / 2 ? -96 : 9);
				});
				//}).on("mouseout", function (d, i) {focus.attr("class", "nodisplay");
				//window.console.log(t, val);
				
			});
		}
		focus = focus_group.append("g").attr("class", "nodisplay").datum(data);
		focus.append("circle")
			.attr("r", 4.5);
		focus.append("text")
			.attr("x", 9)
			.attr("y", -12)
			.attr("dy", ".35em");
		// http://bl.ocks.org/mbostock/3902569
		path = plot_group
			.append("path")
			.attr("class", "line")
			.datum(data)
			.attr("clip-path", "url(#clip)")
			.attr("d", line)
			.style("stroke", color);

		this.show = function () {
			path.attr("d", line);
			needs_show = true;
		};

		this.update = function (t, datapoint) {
			// https://gist.github.com/mbostock/1642874
			// push a new data point onto the back
			data.push(datapoint);
			data.shift();
			ts.push(t);
			ts.shift();
			if (needs_show) {
				window.requestAnimationFrame(this.show);
				needs_show = false;
			}
		};
		this.resize = function (width, height) {
			svg.attr('width', width).attr('height', height);
			//x.range([0, width]);
			//y.range([0, height]);
			x = d3.scale.linear().domain([0, n - 1]).range([0, width]);
			y = d3.scale.linear().domain([upper, lower]).range([0, height]);
			if (clip !== undefined) {
				plot_group.attr("width", width).attr("height", height);
				clip.attr('width', width).attr('height', height);
				y_axis.call(d3.svg.axis().scale(y).orient("right"));
			}
			window.requestAnimationFrame(this.show);
		};
		this.svg = svg;
	}

	// TODO: Add resize handler

	ctx.Plot = Plot;

}(this));