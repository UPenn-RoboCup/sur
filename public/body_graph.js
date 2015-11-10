(function (ctx) {
	'use strict';
	var util = ctx.util,
		RAD_TO_DEG = util.RAD_TO_DEG,
		ws,
		position_container_el,
		current_container_el,
		jointNames = util.jointNames,
		joint_id = jointNames.indexOf('ShoulderR'),
		plot_p,
		plot_cp,
		plot_i = [];


	function ws_update(e) {
		var feedback = JSON.parse(e.data), i;
		//window.console.log(feedback);
		plot_p.update(feedback.t, feedback.p[joint_id] * RAD_TO_DEG);
		plot_cp.update(feedback.t, feedback.cp[joint_id] * RAD_TO_DEG);
		for (i = 0; i < 7; i += 1) {
			plot_i[i].update(feedback.t, feedback.i[joint_id + i]);
		}

	}

	function resize() {
		var i;
		plot_p.resize(position_container_el.clientWidth, position_container_el.clientHeight);
		plot_cp.resize(position_container_el.clientWidth, position_container_el.clientHeight);
		for (i = 0; i < 7; i += 1) {
			plot_i[i].resize(current_container_el.clientWidth, current_container_el.clientHeight);
		}
	}

	// Handle resizing
	window.addEventListener('resize', resize, false);

	util.lhtml('/view/body_graph.html').then(function(view) {
		document.body = view;
		return Promise.all([
			util.ljs("/bc/d3/d3.js"),
			util.ljs("/bc/sprintfjs/sprintf.js"),
			util.ljs("/Plot.js")
		]);
	}).then(function(){
		return util.shm('/streams/feedback');
	}).then(function(port){
			ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port);
			ws.onmessage = ws_update;
		var position_container = d3.select('#position'),
			current_container = d3.select('#current'),
			i;
		// Gyro Stream
		position_container_el = position_container.node();
		plot_p = new ctx.Plot({
			svg: position_container.select('svg'),
			color: 'red',
			lower: -10,
			upper: 50
		});
		plot_cp = new ctx.Plot({
			svg: position_container.select('svg'),
			color: 'blue',
			lower: -10,
			upper: 50
		});
		// Angle Stream
		current_container_el = current_container.node();
		for (i = 0; i < 7; i += 1) {
			plot_i.push(new ctx.Plot({
				svg: current_container.select('svg'),
				color: 'burlywood',
				lower: -200,
				upper: 200
			}));
		}
		// Resize calculation
		setTimeout(resize, 10);
	});
	// Load the CSS that we need for our app
	util.lcss('/css/gh-buttons.css');
	util.lcss('/css/graph.css');
	util.lcss('/css/body_graph.css');
}(this));
