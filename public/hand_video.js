(function (ctx) {
	'use strict';
	var util = ctx.util, feed, ittybittyfeed, h_timeout, has_ittybitty;

	var qHead = [0, 0];
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
	});

	// Load the CSS that we need for our app
	util.lcss('/css/dual_video.css');
	util.lcss('/css/gh-buttons.css');
}(this));
