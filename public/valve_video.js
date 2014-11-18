(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		sprintf = ctx.sprintf,
		util = ctx.util,
		depth_canvas = document.createElement('canvas'),
		depth_ctx = depth_canvas.getContext('2d'),
		depth_img_data,
		lA_canvas = document.createElement('canvas'),
		lA_ctx = lA_canvas.getContext('2d'),
		lA_img_data,
		rgb_canvas,
		rgb_feed,
		fr_metadata,
		depth_worker,
		label_worker,
		toggle_id = 0,
		processing = false,
		overlay,
		valve_colors = ['cyan', 'magenta', 'yellow'],
		recognizer = new window.Worker("/js/recognizer.js"),
		recognizer_init = false,
		audioContext,
		recorder,
		// http://svn.code.sf.net/p/cmusphinx/code/trunk/cmudict/cmudict.0.7a
		wordList = [
			["GRAB", "G R AE B"],
			["YELLOW", "Y EH L OW"],
			["CYAN", "S AY AE N"],
			["MAGENTA", "M AH JH EH N T AH"],
			["ANY", "EH N IY"],
			["COLOR", "K AH L ER"],
			["COLOR(1)", "K AO L ER"],
			["SMALL", "S M AO L"],
			["LARGE", "L AA R JH"],
			["SIZE", "S AY Z"],
			["VALVE", "V AE L V"]
		],
		grammar_grab = {
			start: 0,
			end: 4,
			numStates: 10,
			transitions: [
				{
					from: 0,
					to: 1,
					logp: -1,
					word: "GRAB"
				},
				{
					from: 1,
					to: 3,
					logp: -1.1,
					word: "YELLOW"
				},
				{
					from: 1,
					to: 3,
					logp: -1.1,
					word: "CYAN"
				},
				{
					from: 1,
					to: 3,
					logp: -1.1,
					word: "MAGENTA"
				},
				{
					from: 1,
					to: 3,
					logp: -1.1,
					word: "SMALL"
				},
				{
					from: 1,
					to: 3,
					logp: -1.1,
					word: "LARGE"
				},
				{
					from: 1,
					to: 3,
					logp: -1.1,
					word: "ANY"
				},
				{
					from: 1,
					to: 2,
					logp: -1.1,
					word: "ANY"
				},
				{
					from: 2,
					to: 3,
					logp: -1.1,
					word: "COLOR"
				},
				{
					from: 2,
					to: 3,
					logp: -1.1,
					word: "SIZE"
				},
				{
					from: 3,
					to: 4,
					logp: -2,
					word: "VALVE"
				},

				{
					from: 3,
					to: 4,
					logp: 0,
					word: ""
				}
			]
		};

	// Constant for the Kinect2
	//depth_canvas.width = 512;
	//depth_canvas.height = 424;
	// Webots
	depth_canvas.width = 256;
	depth_canvas.height = 212;
	depth_img_data = depth_ctx.getImageData(0, 0, depth_canvas.width, depth_canvas.height);

	function procFinal(resp) {
		window.console.log('PROC FINAL HYP');
		document.getElementById('guidance').innerHTML = resp.hyp;
		// Send to lua
		d3.xhr("/shm/hcm/guidance/color")
			.header("Content-type", "application/json")
			.post(JSON.stringify(resp.hyp));
		d3.xhr("/shm/hcm/guidance/t")
			.header("Content-type", "application/json")
			.post(JSON.stringify([1]));
		d3.xhr("/fsm/Body/init").post();
	}
	
	// Recognizer starting
	recognizer.onmessage = function (e) {
		var resp = e.data;
		window.console.log(resp);
		if (!recognizer_init) {
			recognizer_init = true;
			//window.console.log('INITIALIZE');
			// Initialize the recognizer
			recognizer.postMessage({
				command: 'initialize',
				callbackId: 0
			});
		} else if (resp.command === 'initialize') {
			//window.console.log('ADD WORDS');
			recognizer.postMessage({
				command: 'addWords',
				data: wordList,
				callbackId: 1
			});
		} else if (resp.id === 1) {
			//window.console.log('ADD GRAMMAR');
			recognizer.postMessage({
				command: 'addGrammar',
				data: grammar_grab,
				callbackId: 2
			});
		} else if (resp.final === true) {
			window.console.log('FINAL', resp);
			procFinal(resp);
		} else if (resp.hyp && resp.hyp.indexOf('VALVE') !== -1) {
			window.console.log('AUTO STOP RECORDING');
			recorder.stop();
		}
	};
	// Start the worker with a dummy message
	recognizer.postMessage();

	function plot_overlay(detect) {
		var i, j, valve_color, valve, valves = overlay.select('g'),
			imin, imax, jmin, jmax, found, tracked = detect.tracked;
		valves.selectAll('*').remove();
		
		for (i = 0; i < tracked.length; i += 1) {
			valve = tracked[i];
			imin = 2 * (valve.boundingBox[0] - 1);
			imax = 2 * (valve.boundingBox[1] + 1);
			jmin = 2 * (valve.boundingBox[2] - 1);
			jmax = 2 * (valve.boundingBox[3] + 1);
			found = valves.append("rect")
				.attr("x", imin)
				.attr("y", jmin)
				.attr("width", imax - imin)
				.attr("height", jmax - jmin);
			if (valve.axisMajor / valve.axisMinor > 3) {
				found.attr('class', 'found_bar');
			} else {
				found.attr('class', 'found_circle');
			}
			valves.append("text").text(sprintf('%0.2f%', 100 * valve.p))
				.attr('font-size', "16px").attr('fill', "blue")
				.attr('x', imin).attr('y', jmax);
		}
		/*
		for (i = 0; i < valve_colors.length; i += 1) {
			valve_color = detect[valve_colors[i]];
			for (j = 0; j < valve_color.length; j += 1) {
				valve = valve_color[j];
				imin = 2 * (valve.boundingBox[0] - 1);
				imax = 2 * (valve.boundingBox[1] + 1);
				jmin = 2 * (valve.boundingBox[2] - 1);
				jmax = 2 * (valve.boundingBox[3] + 1);
				found = valves.append("rect")
					.attr("x", imin)
					.attr("y", jmin)
					.attr("width", imax - imin)
					.attr("height", jmax - jmin);
				if (valve.axisMajor / valve.axisMinor > 3) {
					found.attr('class', 'found_bar');
				} else {
					found.attr('class', 'found_circle');
				}
				valves.append("text").text(100 / detect.n + '%')
					.attr('font-size', "16px").attr('fill', "blue")
					.attr('x', imin).attr('y', jmax);
			}
		}
		*/
	}

	function toggle() {
		toggle_id += 1;
		if (toggle_id > 2) {
			toggle_id = 0;
		}
		switch (toggle_id) {
		case 0:
			rgb_canvas.classList.remove('nodisplay');
			depth_canvas.classList.add('nodisplay');
			lA_canvas.classList.add('nodisplay');
			break;
		case 1:
			rgb_canvas.classList.add('nodisplay');
			depth_canvas.classList.remove('nodisplay');
			lA_canvas.classList.add('nodisplay');
			break;
		case 2:
			rgb_canvas.classList.add('nodisplay');
			depth_canvas.classList.add('nodisplay');
			lA_canvas.classList.remove('nodisplay');
			break;
		default:
			rgb_canvas.classList.remove('nodisplay');
			depth_canvas.classList.add('nodisplay');
			lA_canvas.classList.add('nodisplay');
			break;
		}

	}

	function ask_labelA(obj) {
		if (lA_canvas.width !== obj.w || lA_canvas.height !== obj.h) {
			// Only work with the canvas image data when necessary
			lA_canvas.width = obj.w;
			lA_canvas.height = obj.h;
			lA_img_data = lA_ctx.getImageData(0, 0, lA_canvas.width, lA_canvas.height);
		}
		// Ask the WebWorker for labelA
		obj.data = new window.Uint8Array(obj.data);
		obj.lA_data = lA_img_data;
		label_worker.postMessage(obj, [obj.data.buffer, obj.lA_data.data.buffer]);
	}

	function recv_labelA(e) {
		// Save the transferrable object
		lA_img_data = e.data.lA_data;
		// Paint the image back
		lA_ctx.putImageData(lA_img_data, 0, 0);
	}

	function procDepth(e) {
		if (typeof e.data === 'string') {
			fr_metadata = JSON.parse(e.data);
			if (fr_metadata.t !== undefined) {
				// Add latency measure if possible
				fr_metadata.latency = (e.timeStamp / 1e3) - fr_metadata.t;
			}
		} else if (!processing) {
			fr_metadata.data = new window.Float32Array(e.data);
			fr_metadata.depth_data = depth_img_data;
			processing = true;
			depth_worker.postMessage(fr_metadata, [fr_metadata.data.buffer, fr_metadata.depth_data.data.buffer]);
		}
	}

	function recv_depth(e) {
		// Save the transferrable object
		depth_img_data = e.data.depth_data;
		// Paint the image back
		depth_ctx.putImageData(depth_img_data, 0, 0);
		processing = false;
		//window.console.log(e.data.data);
	}

	// Add the camera view and append
	d3.html('/view/valve_video.html', function (error, view) {
		// Remove landing page elements and add new content
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		// Depth
		depth_worker = new window.Worker("/depth_worker.js");
		depth_worker.onmessage = recv_depth;
		// LabelA WebWorker
		label_worker = new window.Worker("/label_worker.js");
		label_worker.onmessage = recv_labelA;
		// Add the video rgb_feed
		d3.json('/streams/kinect2_color', function (error, port) {
			rgb_feed = new ctx.VideoFeed({
				id: 'kinect2_color',
				port: port,
				extra_cb: function (obj) {
					if (obj.id === 'labelA') {
						ask_labelA(obj);
					} else if (obj.id === 'detect') {
						plot_overlay(obj);
					}
				}
			});
			rgb_canvas = rgb_feed.canvas;
			// Show the images on the page
			document.getElementById('camera_container').appendChild(rgb_canvas);
			document.getElementById('camera_container').appendChild(lA_canvas);
			depth_canvas.classList.add('nodisplay');
			lA_canvas.classList.add('nodisplay');
		});
		// Add the depth rgb_feed
		d3.json('/streams/kinect2_depth', function (error, port) {
			var depth_ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port),
				fr_metadata;
			depth_ws.binaryType = 'arraybuffer';
			depth_ws.onmessage = procDepth;
			document.getElementById('camera_container').appendChild(depth_canvas);
		});
		// Add the overlay
		overlay = d3.select("#camera_container").append("svg").attr('class', 'overlay')
			.attr('viewBox', "0 0 256 212").attr('preserveAspectRatio', "none")
			.attr('width', depth_canvas.width).attr('height', depth_canvas.height);
		overlay.append('g').attr('id', 'valves');

		// Add the debug
		//container.appendChild(feed.canvas);
		d3.select('#start').on('click', function () {
			if (recorder && typeof recorder.start === 'function') {
				// To start recording:
				window.console.log('START RECORDING');
				document.getElementById('guidance').innerHTML = '';
				recorder.start();
			}
		});
		d3.select('#stop').on('click', function () {
			if (recorder && typeof recorder.stop === 'function') {
				// The final hypothesis is sent
				window.console.log('STOP RECORDING');
				recorder.stop();
			}
		});
		d3.select('#toggle').on('click', function () {
			if (recorder && typeof recorder.stop === 'function') {
				// The final hypothesis is sent
				window.console.log('TOGGLE VIEW');
				toggle();
			}
		});
	});

	function setup_mic() {
		// Compatibility layer for WebAudio
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
		// Instantiating AudioContext
		try {
			audioContext = new window.AudioContext();
			//window.console.log('audioContext', audioContext);
		} catch (e) {
			window.console.log("Error initializing Web Audio");
		}
		// Callback once the user authorizes access to the microphone:
		function startUserMedia(stream) {
			var input = audioContext.createMediaStreamSource(stream);
			recorder = new window.AudioRecorder(input, {
				worker: '/js/audioRecorderWorker.js'
			});
			// We can, for instance, add a recognizer as consumer
			window.console.log('Add the recognizer to the microphone');
			if (recognizer) {
				recorder.consumers.push(recognizer);
			}
		}
		// Actually call getUserMedia
		if (navigator.getUserMedia) {
			navigator.getUserMedia(
				{
					audio: true
				},
				startUserMedia,
				function (e) {
					window.console.log("No live audio input in this browser");
				}
			);
		} else {
			window.console.log("No web audio support in this browser");
		}
		window.console.log('Microphone ready');
	}

	// Load the Audio recorder, and then setup the microphone
	util.ljs('/js/audioRecorder.js', setup_mic);
	// Load the CSS that we need for our app
	util.lcss('/css/fullvideo.css');
	util.lcss('/css/overlay.css');
	util.lcss('/css/gh-buttons.css');
}(this));