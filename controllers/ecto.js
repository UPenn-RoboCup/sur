this.addEventListener("load", function () {
	"use strict";
	
	// Add the touches for the whole page...
	// Open the websockets to send back to the host for processing
  var el = document.getElementsByTagName("body")[0],
			port = 9064,
			ws = new this.WebSocket('ws://' + this.hostname + ':' + port),
			beats = {},
			BEAT_INTERVAL = 1000/5, // fps
			trails = {},
			trail_counts = {},
			TRAIL_COUNT = 5,
			TRAIL_INTERVAL = 500/TRAIL_COUNT;
	
	function heartbeat(){
		var beater = {
			t: Date.now(),
			e: 'beat',
			id: this.id
		}
		this.ws.send(JSON.stringify(beater));
	}

	function trail(){
		var id = this.id;
		var cnt = trail_counts[id];
		// Increment the count
		trail_counts[id] = cnt + 1;
		// Check if done the trail
		if(cnt>TRAIL_COUNT){
			clearInterval( trails[id] );
			delete trails[id];
			delete trail_counts[id];
			return;
		}
		var trailer = {
			t: Date.now(),
			id: id,
			e: 'trail',
			cnt: cnt // cnt begins at 1
		};
		this.ws.send(JSON.stringify(trailer));
		console.log(trailer);
	}
	
	function procEvent(evt,name){
		var data = {
			t: evt.timeStamp,
			e: name,
			touch: [],
		}
		var t = evt.changedTouches;
		var n = t.length
		for(var i = 0; i<n; i++){
			var tmp = t[i];
			var id = tmp.identifier;
			var touch = {
				x: tmp.clientX,
				y: tmp.clientY,
				id: id,
			}
			data.touch.push(touch);
			/*
			Clear the timeout for this id,
			since an event happened
			*/
			if( beats[id] !== undefined ){
				clearInterval( beats[id] );
			}
			/* If touch is dead, remove key so 
				memory does not leak. Leave a trail on stop
			*/
			switch(name){
					case 'start':
					case 'move':
						beats[id] = setInterval( heartbeat.bind({id: id, ws: ws}), BEAT_INTERVAL );
						break;
					case 'stop':
						trails[id] = setInterval( trail.bind({id: id, ws: ws}), TRAIL_INTERVAL );
						trail_counts[id] = 0;
						break;
					case 'cancel':
					case 'leave':
					default:
						delete beats[id];
						break;
			}
		}
		ws.send(JSON.stringify(data));
	}
	
	function handleStart(evt){
		evt.preventDefault();
		procEvent(evt,'start');
	}
	function handleEnd(evt){
		evt.preventDefault();
		procEvent(evt,'stop');
	}
	function handleCancel(evt){
		evt.preventDefault();
		procEvent(evt,'cancel');
	}
	function handleLeave(evt){
		evt.preventDefault();
		procEvent(evt,'leave');
	}
	function handleMove(evt){
		evt.preventDefault();
		procEvent(evt,'move');
	}
	
  this.addEventListener("touchstart", handleStart, false);
  this.addEventListener("touchend", handleEnd, false);
  this.addEventListener("touchcancel", handleCancel, false);
  this.addEventListener("touchleave", handleLeave, false);
  this.addEventListener("touchmove", handleMove, false);
	
	// Send when loaded
	ws.onopen = function(evt){
		ws.send(JSON.stringify({
			t: Date.now(),
			e: 'refresh'
		}));
	}
	
});
