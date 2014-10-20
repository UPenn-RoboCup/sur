(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		RAD_TO_DEG = util.RAD_TO_DEG,
		ws,
		position_container_el,
		current_container_el,
		plot_p,
		plot_cp,
		plot_i,
		jointNames = util.jointNames,
		joint_id = jointNames.indexOf('LegLowerL');

	function ws_update(e) {
		var feedback = JSON.parse(e.data),
			t = feedback.t;
		//window.console.log(feedback.i, joint_id, feedback.i[joint_id]);
		plot_p.update(t, feedback.p[joint_id] * RAD_TO_DEG);
		plot_cp.update(t, feedback.cp[joint_id] * RAD_TO_DEG);
		plot_i.update(t, feedback.i[joint_id]);
	}

	function resize() {
		plot_p.resize(position_container_el.clientWidth, position_container_el.clientHeight);
		plot_cp.resize(position_container_el.clientWidth, position_container_el.clientHeight);
		plot_i.resize(current_container_el.clientWidth, current_container_el.clientHeight);
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
		var position_container = d3.select('#position'),
			current_container = d3.select('#current');
		// Gyro Stream
		position_container_el = position_container.node();
		plot_p = new ctx.Plot({
			svg: position_container.select('svg'),
			color: 'red'
			//min: -90,
			//max: 90
		});
		plot_cp = new ctx.Plot({
			svg: position_container.select('svg'),
			color: 'blue'
		});
		// Angle Stream
		current_container_el = current_container.node();
		plot_i = new ctx.Plot({
			svg: current_container.select('svg'),
			color: 'red',
			lower: -50,
			upper: 50
		});
		// Resize calculation
		setTimeout(resize);
	});
	// Load the CSS that we need for our app
	util.lcss('/css/gh-buttons.css');
	util.lcss('/css/graph.css');
	util.lcss('/css/body_graph.css');
}(this));