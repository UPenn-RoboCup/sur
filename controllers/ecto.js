this.addEventListener("load", function () {
	"use strict";
	
	// Add the touches for the whole page...
	// Open the websockets to send back to the host for processing
  var el = document.getElementsByTagName("body")[0],
			port = 9064,
			ws = new this.WebSocket('ws://' + this.hostname + ':' + port),
			to = {};
	
	function heartbeat(){
		this.ws.send(JSON.stringify({
			t: Date.now(),
			e: 'beat',
			id: this.id
		}));
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
			if( to[id] !== undefined ){
				clearInterval( to[id] );
			}
			/* If touch is dead, remove key so 
				memory does not leak
			*/
			if(name!=='start' && name!=='move'){
				delete to[id];
			} else {
				// Set the timeout anew
				to[id] = setInterval( heartbeat.bind({id: id, ws: ws}), 33 );
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
