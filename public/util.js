/*
		Load JavaScript Asynchronously
		https://stackoverflow.com/questions/8586446/dynamically-load-external-javascript-file-and-wait-for-it-to-load-without-usi#8586564
		Load CSS Asynchronously
		http://otaqui.com/blog/1263/simple-script-to-load-css-from-javascript/
		*/
(function (ctx) {
	"use strict";

	// http://www.html5rocks.com/en/tutorials/es6/promises/
	/*
	function get(url) {
		// Return a new promise.
		return new Promise(function(resolve, reject) {
			// Do the usual XHR stuff
			var req = new XMLHttpRequest();
			req.open('GET', url);
			req.onload = function() {
				if (req.status === 200) {
					resolve(req.response);
				} else {
					reject(Error(req.statusText));
				}
			};
			req.onerror = function() {
				reject(Error("Network Error"));
			};
			req.send();
		});
	}
	*/

		// http://www.html5rocks.com/en/tutorials/es6/promises/
	function xhr(url, method, mime) {
		// Return a new promise.
		return new Promise(function(resolve, reject) {
			// Do the usual XHR stuff
			var req = new XMLHttpRequest();
			req.open('GET', url);
			req.setRequestHeader('accept', mime);
			req.onload = function() {
				if (req.status === 200) {
					resolve(req.response);
				} else {
					reject(Error(req.statusText));
				}
			};
			req.onerror = function() {
				reject(Error("Network Error"));
			};
			req.send();
		});
	}
	function shm(url, val){
		if (val) {
			return xhr(url, 'POST', 'application/json').then(function(res){
				return JSON.parse(res);
			});
		}
		return xhr(url, 'GET', 'application/json').then(function(res){
			return JSON.parse(res);
		});
	}

	function ljs(src){
		// Return a new promise.
		return new Promise(function(resolve, reject) {
			var s = document.createElement('script');
			s.src = src;
			s.async = true;
			s.type = "application/javascript";
			s.onload = resolve;
			s.onerror = reject;
			document.getElementsByTagName('head')[0].appendChild(s);
		});
	}
	function lcss(src) {
		return new Promise(function(resolve, reject) {
			var link = document.createElement('link');
			link.type = 'text/css';
			link.rel = 'stylesheet';
			link.href = src;
			link.onload = resolve;
			link.onerror = reject;
			document.getElementsByTagName('head')[0].appendChild(link);
		});
	}
	function lhtml(url) {
		return xhr(url, 'GET', 'text/plain').then(function(text){
			var range = document.createRange();
			range.selectNode(document.body);
			return range.createContextualFragment(text);
		});
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
		lhtml: lhtml,
		shm: shm,
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
