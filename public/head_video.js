(function (ctx) {
	'use strict';
	var util = ctx.util, feed, ittybittyfeed, h_timeout;
	var ws, feedback;
	var qHead = [0, 0];

	function update(fb){
		qHead = fb.p.slice(0,2);
	}

	function toggle() {
		feed.canvas.classList.toggle('nodisplay');
		ittybittyfeed.canvas.classList.toggle('nodisplay');
	}


	function delta_head() {
		qHead[0] += this[0] * util.DEG_TO_RAD;
		qHead[1] += this[1] * util.DEG_TO_RAD;
	}
	function setup_keys(){
		var listener = new keypress.Listener();
		listener.simple_combo("w", delta_head.bind([0,-10]));
		listener.simple_combo("a", delta_head.bind([10,0]));
		listener.simple_combo("s", delta_head.bind([0,10]));
		listener.simple_combo("d", delta_head.bind([-10,0]));
		listener.simple_combo("k", function(){
			qHead[0] = 0;
			qHead[1] = 1;
		});
		// Enter the teleop mode
		listener.simple_combo("enter", function(){
			return util.shm('/fsm/Head/teleop');
		});
		listener.simple_combo("space", function(){
			return util.shm('/shm/hcm/teleop/head', qHead);
		});
		listener.simple_combo("escape", function(){
			return util.shm('/shm/hcm/teleop/head').then(function(q){
				qHead[0] = q[0];
				qHead[1] = q[1];
			});
		});
	}

	// Add the camera view and append
	util.lhtml('/view/hand_video.html').then(function(view) {
		document.body = view;
		return Promise.all([
			util.ljs('/VideoFeed.js'),
			util.ljs("/bc/Keypress/keypress.js")
		]);
	}).then(function(){
		return util.shm('/streams/camera0');
	}).then(function(port){
		feed = new ctx.VideoFeed({
			port: port,
			fr_callback: function(){
				feed.canvas.classList.remove('nodisplay');
				ittybittyfeed.canvas.classList.add('nodisplay');
				if(!h_timeout){h_timeout = setTimeout(toggle, 2e3);}
			},
		});
	}).then(function(){
		return util.shm('/streams/ittybitty0');
	}).then(function(port){
		//console.log('port', port);
		ittybittyfeed = new ctx.VideoFeed({
			port: port,
			fr_callback: function(){
				console.log('frame');
			}
		});
	}).then(function(){
		var container = document.getElementById('camera_container');
		container.appendChild(feed.canvas);
		container.appendChild(ittybittyfeed.canvas);
		ittybittyfeed.canvas.classList.toggle('nodisplay');
		container.addEventListener('dblclick', toggle);
		setTimeout(setup_keys, 0);
	}).then(function(){
		return util.shm('/streams/feedback');
	}).then(function(port){
		ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port);
		ws.onmessage = function (e) {
			if (typeof e.data !== "string") { return; }
			feedback = JSON.parse(e.data);
			update(feedback);
		};
	});

	// Load the CSS that we need for our app
	util.lcss('/css/video.css');
	util.lcss('/css/gh-buttons.css');
}(this));
