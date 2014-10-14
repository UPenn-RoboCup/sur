(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		ws,
		gyro_container_el,
		rpy_container_el,
		plot_gyro = [],
		plot_rpy = [];

	function ws_update(e) {
		var feedback = JSON.parse(e.data);
		//window.console.log(feedback);
		// TODO: Request animation frame?
		plot_gyro[0].update(feedback.gyro[0] * 180 / Math.PI);
		plot_gyro[1].update(feedback.gyro[1] * 180 / Math.PI);
		plot_gyro[2].update(feedback.gyro[2] * 180 / Math.PI);
		//
		plot_rpy[0].update(feedback.rpy[0] * 180 / Math.PI);
		plot_rpy[1].update(feedback.rpy[1] * 180 / Math.PI);
		plot_rpy[2].update(feedback.rpy[2] * 180 / Math.PI);
	}

	function resize() {
		var i;
		for (i = 0; i < plot_gyro.length; i += 1) {
			plot_gyro[i].resize(gyro_container_el.clientWidth, gyro_container_el.clientHeight);
		}
		for (i = 0; i < plot_rpy.length; i += 1) {
			plot_rpy[i].resize(rpy_container_el.clientWidth, rpy_container_el.clientHeight);
		}
	}

	// Handle resizing
	window.addEventListener('resize', resize, false);

	d3.html('/view/body_graph.html', function (error, view) {
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		d3.json('/streams/feedback', function (error, port) {
			ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port);
			ws.onmessage = ws_update;
		});
		var gyro_container = d3.select('#gyro'),
			rpy_container = d3.select('#rpy');
		// Gyro Stream
		gyro_container_el = gyro_container.node();
		plot_gyro.push(new ctx.Plot({
			svg: gyro_container.select('svg'),
			color: 'red'
		}));
		plot_gyro.push(new ctx.Plot({
			svg: gyro_container.select('svg'),
			color: 'blue'
		}));
		plot_gyro.push(new ctx.Plot({
			svg: gyro_container.select('svg'),
			color: 'green'
		}));
		// Angle Stream
		rpy_container_el = rpy_container.node();
		plot_rpy.push(new ctx.Plot({
			svg: rpy_container.select('svg'),
			color: 'red'
		}));
		plot_rpy.push(new ctx.Plot({
			svg: rpy_container.select('svg'),
			color: 'blue'
		}));
		plot_rpy.push(new ctx.Plot({
			svg: rpy_container.select('svg'),
			color: 'green'
		}));
		// Resize calculation
		setTimeout(resize);
	});
	// Load the CSS that we need for our app
	util.lcss('/css/gh-buttons.css');
	util.lcss('/css/graph.css');
	util.lcss('/css/body_graph.css');
}(this));
