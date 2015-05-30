(function (ctx) {
	'use strict';
	var util = ctx.util, feed, ittybittyfeed;

	function procFB(e){
		if (typeof e.data !== "string") { return; }
		var feedback = JSON.parse(e.data);
		return feedback;
	}

	// Put the wrist into a good view
	function setup_keys(){
		var listener = new keypress.Listener();
		listener.simple_combo("space", function(){
			return util.shm('/raw', 'Body.set_larm_command_position(0,7)');
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
		return util.shm('/streams/camera1');
	}).then(function(port){
		feed = new ctx.VideoFeed({
			port: port,
			fr_callback: function(){
				// Maybe give timestamp diff? Alert signal red border?
			},
		});
	}).then(function(){
		return util.shm('/streams/ittybitty1');
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
			return util.shm('/shm/hcm/network/indoors', [3]);
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
