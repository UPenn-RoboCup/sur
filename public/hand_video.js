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

	function sendfsm(){
		util.shm(this);
	}

	function sendshm(){
		console.log(this);
		util.shm(
			'/shm/' + this.getAttribute("data-shm") +
			'/' + this.getAttribute("data-segment") +
			'/' + this.getAttribute("data-key"),
			JSON.parse(this.getAttribute("data-value"))
		);
	}

	function setup_buttons(fsm){
		var allBtns = document.querySelectorAll('#'+fsm+' button');
		for(var i = 0; i<allBtns.length; i+=1){
			var btn = allBtns.item(i);
			if(btn.parentNode.classList.contains("shm")){
				console.log(btn);
				btn.addEventListener('click', sendshm.bind(btn));
			} else if(btn.parentNode.classList.contains("fsm")){
				btn.addEventListener('click', sendfsm.bind(
					'/fsm/'+fsm+'/'+btn.id
				));
			}
		}
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
	}).then(function(){
		return util.shm('/streams/feedback');
	}).then(function(port){
		var ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port);
		ws.onmessage = procFB;
	}).then(function(){
		var allFSMs = document.querySelectorAll('.fsm');
		var i, div;
		for(i = 0; i<allFSMs.length; i+=1){
			div = allFSMs.item(i);
			setup_buttons(div.id);
		}
		var allSHMs = document.querySelectorAll('.shm');
		for(i = 0; i<allSHMs.length; i+=1){
			div = allSHMs.item(i);
			setup_buttons(div.id);
		}
	}).then(setup_keys);

	// Load the CSS that we need for our app
	util.lcss('/css/dual_video.css');
	util.lcss('/css/gh-buttons.css');
}(this));
