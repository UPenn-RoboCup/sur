(function (ctx) {
	'use strict';
	var util = ctx.util, feed, ittybittyfeed;
	var qHead = [0, 0];

	function procFB(e){
		if (typeof e.data !== "string") { return; }
		var feedback = JSON.parse(e.data);
		qHead = feedback.cp.slice(0, 2);
		//console.log(qHead.map(function(r){ return (r*util.RAD_TO_DEG).toPrecision(4); }));
	}

	function delta_head() {
		qHead[0] += this[0] * util.DEG_TO_RAD;
		qHead[1] += this[1] * util.DEG_TO_RAD;
		return util.shm('/shm/hcm/teleop/head', qHead);
	}
	function setup_keys(){
		var listener = new keypress.Listener();
		listener.simple_combo("w", delta_head.bind([0,-10]));
		listener.simple_combo("a", delta_head.bind([10,0]));
		listener.simple_combo("s", delta_head.bind([0,10]));
		listener.simple_combo("d", delta_head.bind([-10,0]));
		listener.simple_combo("k", function(){
			qHead[0] = 0;
			qHead[1] = 0;
			return util.shm('/shm/hcm/teleop/head', qHead);
		});
		// Enter the teleop mode
		listener.simple_combo("enter", function(){
			return util.shm('/fsm/Head/teleop');
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
				// Maybe give timestamp diff? Alert signal red border?
			},
		});
	}).then(function(){
		return util.shm('/streams/ittybitty0');
	}).then(function(port){
		//console.log('port', port);
		ittybittyfeed = new ctx.VideoFeed({
			port: port,
			fr_callback: function(){

			}
		});
	}).then(function(){
		var container = document.getElementById('camera_container');
		container.appendChild(feed.canvas);
		container.appendChild(ittybittyfeed.canvas);
		// dblclick should set the nework mode
		ittybittyfeed.canvas.addEventListener('dblclick', function(){
			return util.shm('/shm/hcm/network/indoors', [2]);
		});
		feed.canvas.addEventListener('dblclick', function(){
			return util.shm('/shm/hcm/network/indoors', [0]);
		});
		setTimeout(setup_keys, 0);
	}).then(function(){
		return util.shm('/streams/feedback');
	}).then(function(port){
		var ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port);
		ws.onmessage = procFB;
	});

	// Load the CSS that we need for our app
	util.lcss('/css/dual_video.css');
	util.lcss('/css/gh-buttons.css');
}(this));
