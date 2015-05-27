(function () {
	'use strict';
	var ws, feedback, svg,
			arc_tq, arc_pos, arc_temp,
			DEG_TO_RAD = util.DEG_TO_RAD,
			RAD_TO_DEG = util.RAD_TO_DEG,
		grip, trigger, extra;

	var RADIUS0 = 40, RADIUS1 = 80, RADIUS2 = 120, RADIUS3 = 160;

	function tq2rad(tq){
		return 2 * Math.PI * tq / 1024;
	}
	function temp2rad(temp){
		return 2 * Math.PI * temp / 150;
	}

	function update(fb){
		//console.log(fb);
		var tqGrip = fb.g;
		tqGrip[0] *= -1; // direction flipped
		var tqAng = tqGrip.map(tq2rad);
		var tqInd = tqAng.map(function(a){
			return arc_tq({startAngle: a-2.5*DEG_TO_RAD, endAngle: a+2.5*DEG_TO_RAD});
		});
		grip.tq_fg.attr("d", tqInd[0]);
		trigger.tq_fg.attr("d", tqInd[1]);
		extra.tq_fg.attr("d", tqInd[2]);
		//
		var qGrip = fb.p.slice(33, 36);
		qGrip[0] *= -1; // direction flipped
		qGrip[0] += 90*DEG_TO_RAD;
		var posAng = qGrip;
		var posInd = posAng.map(function(a){
			return arc_pos({startAngle: a-2.5*DEG_TO_RAD, endAngle: a+2.5*DEG_TO_RAD});
		});
		grip.pos_fg.attr("d", posInd[0]);
		trigger.pos_fg.attr("d", posInd[1]);
		extra.pos_fg.attr("d", posInd[2]);
		//
		var tempGrip = fb.gt;
		tempGrip[0] *= -1; // direction - why not
		var tempAng = tempGrip.map(temp2rad);
		grip.temp_fg.attr("d", arc_temp({startAngle:0, endAngle: tempAng[0]}));
		trigger.temp_fg.attr("d", arc_temp({startAngle:0, endAngle: tempAng[1]}));
		extra.temp_fg.attr("d", arc_temp({startAngle:0, endAngle: tempAng[2]}));
		//
		//console.log('Updating gripper feedback...', tqGrip, qGrip, tempGrip);
		//console.log('Updating gripper feedback...', tqAng, qGrip, tempGrip);
	}

	function handle_tq(){
		var xy = d3.mouse(this.parentNode);
		var theta = Math.atan2(xy[1], xy[0]);
		console.log(xy, theta*RAD_TO_DEG);
	}
	function handle_pos(){
		var xy = d3.mouse(this.parentNode);
		var theta = Math.atan2(xy[1], xy[0]);
		console.log(xy, theta*RAD_TO_DEG);
	}

	function gen_finger(group){
		var o = {};
		// Add the background arc, from 0 to 100% (τ).
		var tq_bg = group.append("path")
				.datum({startAngle: 0, endAngle: 2 * Math.PI})
				.style("fill", "#ddd")
				.attr("d", arc_tq);
		// Add the foreground arc in orange, currently showing 12.7%.
		var tq_fg = group.append("path")
				.datum({startAngle: 0, endAngle: 90 * DEG_TO_RAD})
				.style("fill", "orange")
				.attr("d", arc_tq);
		// Add the background arc, from 0 to 100% (τ).
		var pos_bg = group.append("path")
				.datum({startAngle: 0, endAngle: 2 * Math.PI})
				.style("fill", "#eee")
				.attr("d", arc_pos);
		// Add the foreground arc in orange, currently showing 12.7%.
		var pos_fg = group.append("path")
				.datum({startAngle: 0, endAngle: 90 * DEG_TO_RAD})
				.style("fill", "green")
				.attr("d", arc_pos);
		// Add the background arc, from 0 to 100% (τ).
		var temp_bg = group.append("path")
				.datum({startAngle: 0, endAngle: 2 * Math.PI})
				.style("fill", "#eee")
				.attr("d", arc_temp);
		// Add the foreground arc in orange, currently showing 12.7%.
		var temp_fg = group.append("path")
				.datum({startAngle: 0, endAngle: 90 * DEG_TO_RAD})
				.style("fill", "red")
				.attr("d", arc_temp);

		var incG = group.append("g").attr('class', 'inc');
		var nInc = 8, incSz = 2*Math.PI / nInc;
		for(var i=0; i<nInc; i+=1){
			var start = incSz * i, end = start + incSz;
			incG.append("path")
				.datum({startAngle: start+5*DEG_TO_RAD, endAngle: end-5*DEG_TO_RAD})
				.style("fill", "orange").style('opacity', 0.2)
				.attr("d", arc_tq)
				.on('click', handle_tq);
			incG.append("path")
				.datum({startAngle: start+5*DEG_TO_RAD, endAngle: end-5*DEG_TO_RAD})
				.style("fill", "green").style('opacity', 0.2)
				.attr("d", arc_pos)
				.on('click', handle_pos);
		}

		o.tq_bg = tq_bg;
		o.tq_fg = tq_fg;
		o.pos_bg = pos_bg;
		o.pos_fg = pos_fg;
		o.temp_bg = temp_bg;
		o.temp_fg = temp_fg;
		o.el = group;
		return o;
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
				.outerRadius(RADIUS1);
		arc_pos = d3.svg.arc()
				.innerRadius(RADIUS1)
				.outerRadius(RADIUS2);
		arc_tq = d3.svg.arc()
				.innerRadius(RADIUS2)
				.outerRadius(RADIUS3);

		grip = gen_finger(
			svg.append("g")
			.attr("transform", "translate(" + 3*RADIUS3 + "," + 2*RADIUS3 + ")")
		);
		grip.el.append('text').text('Grip (1)')
			.attr("transform", "translate(-25, 5)");
		//
		trigger = gen_finger(
			svg.append("g")
			.attr("transform", "translate(" + RADIUS3 + "," + RADIUS3 + ")")
		);
		trigger.el.append('text').text('Trigger (2)')
			.attr("transform", "translate(-36, 5)");
		//
		extra = gen_finger(
			svg.append("g")
			.attr("transform", "translate(" + RADIUS3 + "," + 4*RADIUS3 + ")")
		);
		extra.el.append('text').text('Extra (3)')
			.attr("transform", "translate(-28, 5)");

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
			update(feedback);
		};
	}).then(setup_charts).catch(function(e){
		console.log('Loading error', e);
	});

}(this));
