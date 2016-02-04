(function(ctx) {
	'use strict';
	var util = ctx.util;
	var orientation_el, motion_el, force_el;
	var ws;
	var port = 8999;
	var strokes = [];

	var hOrientation = function(e) {
		var absolute = e.absolute;
		var alpha = e.alpha;
		var beta = e.beta;
		var gamma = e.gamma;

		// Change the color

		orientation_el.innerHTML = 'a: ' + alpha + '<br/>b: ' + beta + '<br/>g: ' + gamma;
		// Do stuff with the new orientation data
	}

	var hMotion = function(e) {
		// 100 Hz
		var accel = e.acceleration;
		var accel0 = e.accelerationIncludingGravity;
		var gyro = e.rotationRate;
		var dt = e.interval;

		motion_el.innerHTML = 'acc: ' + [accel.x, accel.y, accel.z].join(',') + '<br/>gyr: ' + [gyro.alpha, gyro.beta, gyro.gamma].join(',') + '<br/>dt: ' + dt;
		// Do stuff with the new orientation data
		
		//ws.send(force);
	}

	var hTouchStart = function(e) {
    strokes.push([e]);
	}
	
	var hTouchEnd = function(e) {
    strokes[strokes.length-1].push(e);
    console.log(strokes[strokes.length-1]);
	}

	var hTouchMove = function(e) {
		e.preventDefault();
		
		// Don't consider multi-touch for now...
		if (e.targetTouches.length > 1) {
			return;
		}

		// Enqueue this part of the stroke
		strokes[strokes.length-1].push(e);
		
		// Force touch
		force_el.innerHTML = e.targetTouches[0].force;
	}

		// Initialization code
	Promise.all([
		// Load all scripts and styles
		util.lcss('/css/gh-buttons.css'),
		util.ljs('/bc/sprintfjs/sprintf.js')
	]).then(function() {
		// Load and yield the markup
		return util.lhtml('/view/remote.html');
	}).then(function(view) {
		// Reload the DOM
		document.body = view;
	}).then(function() {
		console.log('STARTING!!');
		// HTML Debug printing
		orientation_el = document.getElementById('orientation');
		motion_el = document.getElementById('motion');
		force_el = document.getElementById('force');
		orientation_el.innerHTML = 'init...';
		motion_el.innerHTML = 'init...';
		force_el.innerHTML = 'init...';
		// Capture the data from the IMU
		window.addEventListener('deviceorientation', hOrientation);
		window.addEventListener("devicemotion", hMotion, true);
		// Send IMU data to the forwarder
		ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port);
		// Register the touches
		window.addEventListener('touchstart', hTouchStart, false);
		window.addEventListener('touchmove', hTouchMove, false);
		window.addEventListener('touchend', hTouchEnd, false);
	});

}(this));
