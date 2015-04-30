/*
		Load JavaScript Asynchronously
		https://stackoverflow.com/questions/8586446/dynamically-load-external-javascript-file-and-wait-for-it-to-load-without-usi#8586564
		Load CSS Asynchronously
		http://otaqui.com/blog/1263/simple-script-to-load-css-from-javascript/
		*/
(function (ctx) {
	"use strict";

	function ljs(src, cb) {
		if (typeof src !== 'string') {
			return;
		}
		var scripts = document.getElementsByTagName('script'),
			len = scripts.length,
			i,
			s;
		for (i = 0; i < len; i = i + 1) {
			if (scripts[i].src.indexOf(src) !== -1) {
				return;
			}
		}
		s = document.createElement('script');
		s.src = src;
		s.async = true;
		s.type = "application/javascript";
		if (typeof cb === 'function') {
			s.onreadystatechange = s.onload = function () {
				var state = s.readyState;
				if (!state || /loaded|complete/.test(state)) {
					setTimeout(cb);
				}
			};
		}
		document.getElementsByTagName('head')[0].appendChild(s);
	}

	function lcss(url, cb) {
		if (typeof url !== 'string') {
			return;
		}
		var links = document.getElementsByTagName('link'),
			len = links.length,
			i,
			head,
			link;
		for (i = 0; i < len; i = i + 1) {
			if (links[i].href.indexOf(url) !== -1) {
				return;
			}
		}
		head = document.getElementsByTagName('head')[0];
		link = document.createElement('link');
		link.type = 'text/css';
		link.rel = 'stylesheet';
		link.href = url;
		if (typeof cb === 'function') {
			link.onreadystatechange = link.onload = function () {
				var state = link.readyState;
				if (!state || /loaded|complete/.test(state)) {
					setTimeout(cb);
				}
			};
		}
		head.appendChild(link);
	}

	// Take in an array of debugging messages and combine into the info div
	function debug(arr){
		document.getElementById('info').innerHTML = arr.join('<br/>');
	}

	var pow = Math.pow,
    abs = Math.abs,
    sqrt = Math.sqrt,
    exp = Math.exp,
    min = Math.min,
		max = Math.max,
    PI = Math.PI,
		HALF_PI = PI / 2,
		TWO_PI = 2 * PI,
    atan = Math.atan,
    atan2 = Math.atan2,
    sin = Math.sin,
    cos = Math.cos,
    floor = Math.floor,
		ceil = Math.ceil,
		round = Math.round;

	var mapFuncs = {
		dist: function(p){
			return sqrt(pow(this[0] - p[0], 2) + pow(this[1] - p[1], 2));
		},
		dist3: function(p){
			return sqrt(pow(this[0] - p[0], 2) + pow(this[1] - p[1], 2) + pow(this[2] - p[2], 2));
		},
		smallest: function(prev, now, inow) {
			return now < prev[0] ? [now, inow] : prev;
		},
		lookup: function(i) { return this[i]; },
		apply: function apply(f) { return f(this); },
		angle: function(p) {
			return atan2(p[1] - this[1], p[0] - this[0]);
		},
		iangle: function(a) {
			// this: nChunks
			return (a / TWO_PI + 0.5) * this;
		},
		iangle_valid: function(a) {
			// Integer from [0, this-1]
			return min( round((a / TWO_PI + 0.5) * this), this - 1);
		},
		iangle_inv: function(i){
			// this: nChunks
			return (TWO_PI / this) * i - PI;
		},
		dist2line: function(p0, p1){
			return abs(
				this[0] * (p1[1] - p0[1]) -
				this[1] * (p1[0] - p0[0]) +
				p1[0] * p0[1] -
				p1[1] * p0[0]
			) / sqrt(pow(p0[0] - p1[0], 2) + pow(p0[1] - p1[1], 2));
		},
		sign: function (v) {
			if(v===0){ return 0; }
			return (v > 0) ? 1 : -1;
		}
	};

	function mat3_times_vec(m, v){
		'use strict';
		return m.map(function(r){
			return r[0]*this[0] + r[1]*this[1] + r[2]*this[2];
		}, v);
	}

	function get_THREE_mat3(tm){
		return [
			tm.elements.subarray(0, 4),
			tm.elements.subarray(4, 8),
			tm.elements.subarray(8, 12)
		].map(function(v){
			return [v[0], v[1], v[2]];
		});
	}

	// Exports
	// TODO: Pollute global namespace, or call these utils?
	ctx.util = {
		debug: debug,
		ljs: ljs,
		lcss: lcss,
		DEG_TO_RAD: Math.PI / 180,
		RAD_TO_DEG: 180 / Math.PI,
		mapFuncs: mapFuncs,
		mat3_times_vec: mat3_times_vec,
		get_THREE_mat3: get_THREE_mat3,
		jointNames: [
			// Head (Yaw, Pitch)
			"Neck","Head",
			// Left Arm
			"ShoulderL", "ArmUpperL", "LeftShoulderYaw",
			"ArmLowerL","LeftWristYaw","LeftWristRoll","LeftWristYaw2",
			// Left leg
			"PelvYL","PelvL","LegUpperL","LegLowerL","AnkleL","FootL",
			// Right leg
			"PelvYR","PelvR","LegUpperR","LegLowerR","AnkleR","FootR",
			// Right arm
			"ShoulderR", "ArmUpperR", "RightShoulderYaw","ArmLowerR",
			"RightWristYaw","RightWristRoll","RightWristYaw2",
			// Waist
			"TorsoYaw","TorsoPitch",
			// Gripper
			"l_grip", "l_trigger", "l_extra",
			"r_grip", "r_trigger", "r_extra",
			// lidar movement
			"ChestLidarPan",
		]
	};
}(this));
