this.addEventListener("load", function () {
	'use strict';
	// Add the touches for the whole page...
	// Open the websockets to send back to the host for processing
  var body = document.getElementsByTagName("body")[0],
		port = 9064,
		ws = new window.WebSocket('ws://' + this.hostname + ':' + port),
		touches = {},
		BEAT_INTERVAL = 75,
		N_TRAILS = 5,
		TRAIL_INTERVAL = 500 / N_TRAILS,
		V1,
		V2,
		d3 = this.d3,
		svg = d3.select("body").append("svg")
			.attr("class", "overlay")
			.attr("width", '100%')
			.attr("height", '100%'),
		standardLineF = d3.svg.line()
			.x(function (d) { return d.x; })
			.y(function (d) { return d.y; })
			.interpolate("linear"),
		circleSymbolF = d3.svg.symbol()
			.type('circle')
			.size(function (d) { return 10 * d.sz; }),
		symbolTransF = function (d) {
			return "translate(" + d.x + "," + d.y + ")";
		},
		beats_group = svg.append('g');

	function draw (swipe) {
		// Plot some items
		//window.console.log(processed);
		// Draw with d3
		// TODO: Should I be using enter and data?
		// Add contacts and trails
		svg.append("path")
			.attr("d", standardLineF(swipe))
			.attr("stroke", "green")
			.attr("stroke-width", 4)
			.attr("fill", "none");
	}

	function addTouch (changedTouches) {
		var i, tmp, id, touch,
			n = changedTouches.length;
		for (i = 0; i < n; i = i + 1) {
			tmp = changedTouches[i];
			id = tmp.identifier;
			touch = {
				e: name,
				t: evt.timeStamp,
				x: tmp.clientX,
				y: tmp.clientY,
				id: id
			};
			if (touches[id]===undefined) {
				// Make the object array
				touches[id] = [touch];
			} else {
				// Append the array with more data
				touches[id].push(touch);
			}
		}
	}

	function formTouchPacket (changedTouches) {
		// Only send the finished packets
		var i,
			id,
			n = changedTouches.length,
			packet = {};
		for (i = 0; i < n; i = i + 1) {
			id = changedTouches[i].identifier;
			// Append the array with more data
			packet.push(touches[id]);
			// Kill off, since we are sending the packet
			delete touches[id];
		}
		return packet;
	}

	function procTouch (evt, name) {
		var packet, i, n;
		addTouch(evt.changedTouches);
		if(name==='stop' || name==='cancel' || name==='leave'){
			packet = formTouchPacket(evt.changedTouches);
			// Send when done a swipe
			ws.send(JSON.stringify(packet));
			for (i = 0, n = packet.length; i < n; i = i + 1) {
				draw(packet);
			}
		}
	}

	function procMouse(evt, name) {
		var touch = {
			e: name,
			t: evt.timeStamp,
			x: evt.clientX,
			y: evt.clientY,
			id: 1
		},
		swipe = touches[1];
		if (swipe===undefined) {
			// Make the object array
			swipe = [touch];
			touches[1] = swipe;
		} else {
			// Append the array with more data
			swipe.push(touch);
		}
		if(name==='stop' || name==='cancel' || name==='leave'){
			// Send when done a swipe
			ws.send(JSON.stringify([swipe]));
			draw(swipe);
			// Kill it off
			delete touches[1];
		}
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
	}
	function handleMouseDown(evt) {
		evt.preventDefault();
		procMouse(evt, 'start');
		window.addEventListener("mousemove", handleMouseMove, false);
	}
	function handleMouseUp(evt) {
		evt.preventDefault();
		procMouse(evt, 'stop');
		window.removeEventListener("mousemove", handleMouseMove, false);
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
	//ws.onopen = refresh;
	// Overlay some svg of the swipe
	//ws.onmessage = draw;

	// TODO: Use animation frames to send the websocket data...?

	// Add the Video stream overlay
	V1 = new this.Video(9003);
	V1.id  = 'arm_cam';
	//V2 = new this.Video('kinect_cam', 9004);
	// Place on the page
  body.appendChild(V1.img);

});
