this.addEventListener("load", function () {
	'use strict';
	// Add the touches for the whole page...
	// Open the websockets to send back to the host for processing
  var body = document.getElementsByTagName("body")[0],
		port = 9064,
		ws = new window.WebSocket('ws://' + this.hostname + ':' + port),
		beats = {},
		BEAT_INTERVAL = 50,
		trails = {},
		trail_counts = {},
		TRAIL_COUNT = 5,
		TRAIL_INTERVAL = 500 / TRAIL_COUNT,
		V1,
		V2;
	
	function draw(e){
		// Parse the data
		var processed = JSON.parse(e.data);
		// Plot some items
		console.log(processed);
	}
	
	function refresh(evt) {
		ws.send(JSON.stringify({
			t: Date.now(),
			e: 'refresh'
		}));
	}
	
	function heartbeat(id) {
		var beater = {
			t: Date.now(),
			e: 'beat',
			id: id
		};
		ws.send(JSON.stringify(beater));
	}

	function trail(id) {
		var cnt = trail_counts[id],
			trailer;
		// Increment the count
		trail_counts[id] = cnt + 1;
		// Check if done the trail
		if (cnt > TRAIL_COUNT) {
			clearInterval(trails[id]);
			delete trails[id];
			delete trail_counts[id];
			trailer = {
				t: Date.now(),
				id: id,
				e: 'finish'
			};
		} else {
			trailer = {
				t: Date.now(),
				id: id,
				e: 'trail',
				cnt: cnt // cnt begins at 1
			};
		}
		ws.send(JSON.stringify(trailer));
	}
	
	function procTouch(evt, name) {
		var data = {
			t: evt.timeStamp,
			e: name,
			touch: []
		},
			t = evt.changedTouches,
			n = t.length,
			i, tmp, id, touch;
		for (i = 0; i < n; i = i + 1) {
			tmp = t[i];
			id = tmp.identifier;
			touch = {
				x: tmp.clientX,
				y: tmp.clientY,
				id: id
			};
			data.touch.push(touch);
			/*
			Clear the timeout for this id,
			since an event happened
			*/
			if (beats[id] !== undefined) {
				clearInterval(beats[id]);
			}
			/* If touch is dead, remove key so 
				memory does not leak. Leave a trail on stop
			*/
			switch (name) {
			case 'start':
			case 'move':
				beats[id] = setInterval(heartbeat.bind(undefined, id), BEAT_INTERVAL);
				break;
			case 'stop':
				trails[id] = setInterval(trail.bind(undefined, id), TRAIL_INTERVAL);
				trail_counts[id] = 0;
				break;
			case 'cancel':
			case 'leave':
				delete beats[id];
				break;
			}
		}
		ws.send(JSON.stringify(data));
	}
	
	function procMouse(evt, name) {
		var data = {
			t: evt.timeStamp,
			e: name,
			touch: [{
				x: evt.clientX,
				y: evt.clientY,
				id: 1
			}]
		};
		if (beats[1] !== undefined) {
			clearInterval(beats[1]);
		}
		ws.send(JSON.stringify(data));
	}
	
	function handleStart(evt) {
		evt.preventDefault();
		procTouch(evt, 'start');
	}
	function handleEnd(evt) {
		evt.preventDefault();
		procTouch(evt, 'stop');
	}
	function handleCancel(evt) {
		evt.preventDefault();
		procTouch(evt, 'cancel');
	}
	function handleLeave(evt) {
		evt.preventDefault();
		procTouch(evt, 'leave');
	}
	function handleMove(evt) {
		evt.preventDefault();
		procTouch(evt, 'move');
	}
	function handleMouseMove(evt) {
		evt.preventDefault();
		procMouse(evt, 'move');
		beats[1] = setInterval(heartbeat.bind(undefined, 1), BEAT_INTERVAL);
	}
	function handleMouseDown(evt) {
		evt.preventDefault();
		procMouse(evt, 'start');
		window.addEventListener("mousemove", handleMouseMove, false);
		beats[1] = setInterval(heartbeat.bind(undefined, 1), BEAT_INTERVAL);
	}
	function handleMouseUp(evt) {
		evt.preventDefault();
		procMouse(evt, 'stop');
		window.removeEventListener("mousemove", handleMouseMove, false);
		trails[1] = setInterval(trail.bind(undefined, 1), TRAIL_INTERVAL);
		trail_counts[1] = 0;
	}
	
  window.addEventListener("touchstart", handleStart, false);
  window.addEventListener("touchend", handleEnd, false);
  window.addEventListener("touchcancel", handleCancel, false);
  window.addEventListener("touchleave", handleLeave, false);
  window.addEventListener("touchmove", handleMove, false);
	// Compatibility with desktop
	window.addEventListener("mousedown", handleMouseDown, false);
	window.addEventListener("mouseup", handleMouseUp, false);
	// Send when loaded
	ws.onopen = refresh;
	// Overlay some svg of the swipe
	ws.onmessage = draw;
	
	// TODO: Use animation frames to send the websocket data...?
	
	// Add the Video stream overlay
	V1 = new this.Video('arm_cam', 9003);
	//V2 = new this.Video('kinect_cam', 9004);
	// Place on the page
  body.appendChild(V1.img);
	
});
