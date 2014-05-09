this.addEventListener("load", function () {
	'use strict';
	// Add the touches for the whole page...
	// Open the websockets to send back to the host for processing
  var body = document.getElementsByTagName("body")[0],
		port = 9064,
		ws = new window.WebSocket('ws://' + this.hostname + ':' + port),
		touches = {},
		RAD_TO_DEG = 180 / Math.PI,
		BEAT_INTERVAL = 75,
		N_TRAILS = 5,
		TRAIL_INTERVAL = 500 / N_TRAILS,
		V1,
		img,
		d3 = this.d3,
		svg = d3.select("body").append("svg")
			.attr("class", "overlay")
			.attr("width", '100%')
			.attr("height", '100%'),
		swipecross = svg.append("path"),
		swipebox = svg.append("rect"),
		standardLineF = d3.svg.line()
			.x(function (d) {
				var img_meta = img.metadata;
				if (img_meta!==undefined) {
					return img.clientWidth * d.x / img_meta.w;
				} else {
					return img.clientWidth * d.x / 320;
				}
			})
			.y(function (d) {
				var img_meta = img.metadata;
				if (img_meta!==undefined) {
					return img.clientHeight * d.y / img_meta.h;
				} else {
					return img.clientHeight * d.y / 240;
				}
			})
			.interpolate("linear");

	function drawSwipe (swipe) {
		// Plot some items
		//window.console.log(processed);
		// Draw with d3
		// TODO: Should I be using enter and data?
		// Add contacts and trails
		swipecross
			.attr("d", standardLineF(swipe))
			.attr("stroke", "green")
			.attr("stroke-width", 4)
			.attr("fill", "none");
	}

	function drawBBox (bbox) {

		var img_meta = img.metadata,
			scaleX,
			scaleY,
			xc = bbox.xc,
			yc = bbox.yc,
			a = bbox.a * RAD_TO_DEG,
			major = bbox.major,
			minor = bbox.minor;

		if (img_meta!==undefined){
			scaleX = img.clientWidth / img_meta.w;
			scaleY = img.clientHeight / img_meta.h;
		} else {
			scaleX = img.clientWidth / 320;
			scaleY = img.clientHeight / 240;
		}
		major *= scaleX;
		minor *= scaleY;
		xc *= scaleX;
		yc *= scaleY;

		swipebox
			.attr("x", xc - major/2)
			.attr("y", yc - minor/2)
			.attr("width", major)
			.attr("height", minor)
			.attr("transform", "rotate(" + a + "," + xc + "," + yc + ")")
			.attr("stroke", "red")
			.attr("stroke-width", 4)
			.attr("fill", "none");
		// Kill off the old swipe
		//swipecross.attr("d", "")
	}

	function addTouch (evt, name) {
		var i, tmp, id, touch,
			changedTouches = evt.changedTouches,
			n = changedTouches.length,
			px_x,
			px_y,
			im_w,
			im_h,
			img_meta = img.metadata;

		if (img_meta!==undefined){
			im_w = img.metadata.w;
			im_h = img.metadata.h;
		} else {
			im_w = 320;
			im_h = 240;
		}

		for (i = 0; i < n; i = i + 1) {
			tmp = changedTouches[i];
			id = tmp.identifier;
			px_x = im_w * tmp.clientX / img.clientWidth;
			px_y = im_h * tmp.clientY / img.clientHeight;
			touch = {
				e: name,
				t: evt.timeStamp/1e3, // TODO: hope this exists
				x: px_x,
				y: px_y,
				id: id
			};
			console.log(touch);
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
			packet = [];
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
		addTouch(evt, name);
		if(name==='stop' || name==='cancel' || name==='leave'){
			packet = formTouchPacket(evt.changedTouches);
			// Send when done a swipe
			ws.send(JSON.stringify(packet));
			for (i = 0, n = packet.length; i < n; i = i + 1) {
				drawSwipe(packet[i]);
			}
		}
	}

	function procMouse(evt, name) {
		var img_meta = img.metadata;
		if(img_meta===undefined){
			img_meta = {
				w: 320,
				h: 240,
			};
		}
		// Must handle the image display width/height vs the actual image
		var px_x = img_meta.w * evt.clientX / img.clientWidth,
			px_y = img_meta.h * evt.clientY / img.clientHeight,
			touch = {
				e: name,
				t: evt.timeStamp/1e3,
				x: px_x,
				y: px_y,
				id: 1,
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
			drawSwipe(swipe);
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
	ws.onmessage = function(e){
		var msg = JSON.parse(e.data);
		if (msg.id==='bbox'){
			drawBBox(msg);
		}
	};

	// TODO: Use animation frames to send the websocket data...?

	// Add the Video stream overlay
	V1 = new this.Video(9003);
	V1.id  = 'arm_cam';
	//V2 = new this.Video('kinect_cam', 9004);
	// Place on the page
  img = body.appendChild(V1.img);

	// When the window size changes
	window.addEventListener('resize', function (e) {
		//img.clientWidth;
		//img.clientHeight;
		console.log(img.metadata);
	}, false);

});
