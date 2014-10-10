(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		ws,
		plot;

	function ws_update(e) {
		var feedback = JSON.parse(e.data);
		// TODO: Request animation frame
		plot.update(feedback.gyro[0] * 180 / Math.PI);
		//window.console.log(feedback);
	}

	// Handle resizing
	window.addEventListener('resize', function () {
		var s = d3.select('svg#gyro_roll'),
			s0 = s[0][0],
			SVG_WIDTH = s0.clientWidth,
			SVG_HEIGHT = s0.clientHeight;
		plot.resize(SVG_WIDTH, SVG_HEIGHT);
	}, false);

	d3.html('/view/body_graph.html', function (error, view) {
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		d3.json('/streams/feedback', function (error, port) {
			ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port);
			ws.onmessage = ws_update;
		});
		var svg_gyro = d3.select('body').append('svg')
			.attr('id', 'gyro_roll')
			.attr('width', 720).attr('height', 480);
		plot = new ctx.Plot({
			svg: svg_gyro[0][0],
			id: 'gyro_roll'
		});
	});
	// Load the CSS that we need for our app
	util.lcss('/css/gh-buttons.css');
	util.lcss('/css/graph.css');
}(this));
