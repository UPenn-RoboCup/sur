this.addEventListener("load", function () {
	"use strict";
	
	// Add the touches for the whole page...
	// Open the websockets to send back to the host for processing
  var el = document.getElementsByTagName("body")[0],
			port = 9064,
			ws = new this.WebSocket('ws://' + this.hostname + ':' + port);
	
	function handleStart(evt){
		evt.preventDefault();
		// TODO: Is there timestamping already?
		// Let's add one anyway...
		evt.ts = Date.now();
		ws.send(JSON.stringify(evt));
	}
	function handleEnd(evt){
		evt.preventDefault();
		ws.send(JSON.stringify(evt));
	}
	function handleCancel(evt){
		evt.preventDefault();
		ws.send(JSON.stringify(evt));
	}
	function handleLeave(evt){
		evt.preventDefault();
		ws.send(JSON.stringify(evt));
	}
	function handleMove(evt){
		evt.preventDefault();
		ws.send(JSON.stringify(evt));
	}
	
  el.addEventListener("touchstart", handleStart, false);
  el.addEventListener("touchend", handleEnd, false);
  el.addEventListener("touchcancel", handleCancel, false);
  el.addEventListener("touchleave", handleLeave, false);
  el.addEventListener("touchmove", handleMove, false);
	
	// Send when loaded
	ws.onopen = function(evt){
		ws.send(JSON.stringify(evt));
	}
	
});
