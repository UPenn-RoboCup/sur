(function () {
	'use strict';
	var ws, feedback, svg,
			arc_tq, arc_pos, arc_temp,
			DEG_TO_RAD = util.DEG_TO_RAD,
		grip, trigger, extra;

	var RADIUS0 = 40, RADIUS1 = 80, RADIUS2 = 120, RADIUS3 = 160;

	function tq2rad(tq){
		return 2 * Math.PI * tq / 1024;
	}
	function temp2rad(temp){
		return 2 * Math.PI * temp / 150;
	}

	function update(fb){
		var tqGrip = fb.g;
		grip.tq_fg.attr("d", arc_tq({endAngle: tq2rad(tqGrip[0])}));
		trigger.tq_fg.attr("d", arc_tq({endAngle: tq2rad(tqGrip[1])}));
		extra.tq_fg.attr("d", arc_tq({endAngle: tq2rad(tqGrip[2])}));
		//
		var qGrip = fb.pos.slice(33, 36);
		grip.tq_fg.attr("d", arc_pos({endAngle: qGrip[0]}));
		trigger.tq_fg.attr("d", arc_pos({endAngle: qGrip[1]}));
		extra.tq_fg.attr("d", arc_pos({endAngle: qGrip[2]}));
		//
		var tempGrip = fb.gt;
		grip.tq_fg.attr("d", arc_temp({endAngle: temp2rad(tempGrip[0])}));
		trigger.tq_fg.attr("d", arc_temp({endAngle: temp2rad(tempGrip[1])}));
		extra.tq_fg.attr("d", arc_temp({endAngle: temp2rad(tempGrip[2])}));
		//
		console.log('Updating gripper feedback...', qGrip, tqGrip, tempGrip);
	}

	function gen_finger(group){
		// Add the background arc, from 0 to 100% (τ).
		var tq_bg = group.append("path")
				.datum({endAngle: 2 * Math.PI})
				.style("fill", "#ddd")
				.attr("d", arc_tq);
		// Add the foreground arc in orange, currently showing 12.7%.
		var tq_fg = group.append("path")
				.datum({endAngle: 90 * DEG_TO_RAD})
				.style("fill", "orange")
				.attr("d", arc_tq);
		// Add the background arc, from 0 to 100% (τ).
		var pos_bg = group.append("path")
				.datum({endAngle: 2 * Math.PI})
				.style("fill", "#eee")
				.attr("d", arc_pos);
		// Add the foreground arc in orange, currently showing 12.7%.
		var pos_fg = group.append("path")
				.datum({endAngle: 90 * DEG_TO_RAD})
				.style("fill", "green")
				.attr("d", arc_pos);
		// Add the background arc, from 0 to 100% (τ).
		var temp_bg = group.append("path")
				.datum({endAngle: 2 * Math.PI})
				.style("fill", "#eee")
				.attr("d", arc_temp);
		// Add the foreground arc in orange, currently showing 12.7%.
		var temp_fg = group.append("path")
				.datum({endAngle: 90 * DEG_TO_RAD})
				.style("fill", "red")
				.attr("d", arc_temp);

		return {
			tq_bg: tq_bg,
			tq_fg: tq_fg,
			pos_bg: pos_bg,
			pos_fg: pos_fg,
			temp_bg: temp_bg,
			temp_fg: temp_fg,
			el: group
		};
	}

	function setup_charts(){
		var width = 5*RADIUS3,
    height = 5*RADIUS3;
		// Create the SVG container, and apply a transform such that the origin is the
		// center of the canvas. This way, we don't need to position arcs individually.
		svg = d3.select("body").append("svg")
				.attr("width", width)
				.attr("height", height);

		// An arc function with all values bound except the endAngle. So, to compute an
		// SVG path string for a given angle, we pass an object with an endAngle
		// property to the `arc` function, and it will return the corresponding string.
		arc_temp = d3.svg.arc()
				.innerRadius(RADIUS0)
				.outerRadius(RADIUS1)
				.startAngle(0);
		arc_pos = d3.svg.arc()
				.innerRadius(RADIUS1)
				.outerRadius(RADIUS2)
				.startAngle(0);
		arc_tq = d3.svg.arc()
				.innerRadius(RADIUS2)
				.outerRadius(RADIUS3)
				.startAngle(0);

		grip = gen_finger(
			svg.append("g")
			.attr("transform", "translate(" + 3*RADIUS3 + "," + 2*RADIUS3 + ")")
		);
		grip.el.append('text').text('Grip')
			.attr("transform", "translate(-15, 0)");
		//
		trigger = gen_finger(
			svg.append("g")
			.attr("transform", "translate(" + RADIUS3 + "," + RADIUS3 + ")")
		);
		trigger.el.append('text').text('Trigger')
			.attr("transform", "translate(-24, 0)");
		//
		extra = gen_finger(
			svg.append("g")
			.attr("transform", "translate(" + RADIUS3 + "," + 4*RADIUS3 + ")")
		);
		extra.el.append('text').text('Extra')
			.attr("transform", "translate(-18, 0)");

	}

	// Load everything
	Promise.all([
		//util.lcss('/css/gripper.css'),
		util.lcss('/css/gh-buttons.css'),
		util.ljs('/bc/d3/d3.min.js'),
	]).then(function(){
		return util.lhtml('/view/gripper.html');
	}).then(function(view){
		document.body = view;
	})
	.then(function(){
		return util.shm('/streams/feedback');
	}).then(function(port){
		ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port);
		ws.onmessage = function (e) {
			if (typeof e.data !== "string") { return; }
			feedback = JSON.parse(e.data);
			update();
		};
	}).then(setup_charts).catch(function(e){
		console.log('Loading error', e);
	});

}(this));
