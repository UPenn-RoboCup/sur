(function (ctx) {
	'use strict';
	var d3 = ctx.d3,
		util = ctx.util,
		recognizer = new window.Worker("/js/recognizer.js"),
		recognizer_init = false,
		// Try the default pocketsphinx live.html demo
		wordList = [["ONE", "W AH N"], ["TWO", "T UW"], ["THREE", "TH R IY"], ["FOUR", "F AO R"], ["FIVE", "F AY V"], ["SIX", "S IH K S"], ["SEVEN", "S EH V AH N"], ["EIGHT", "EY T"], ["NINE", "N AY N"], ["ZERO", "Z IH R OW"]],
		grammarDigits = {
			numStates: 1,
			start: 0,
			end: 0,
			transitions: [{
				from: 0,
				to: 0,
				word: "ONE"
		}, {
				from: 0,
				to: 0,
				word: "TWO"
		}, {
				from: 0,
				to: 0,
				word: "THREE"
		}, {
				from: 0,
				to: 0,
				word: "FOUR"
		}, {
				from: 0,
				to: 0,
				word: "FIVE"
		}, {
				from: 0,
				to: 0,
				word: "SIX"
		}, {
				from: 0,
				to: 0,
				word: "SEVEN"
		}, {
				from: 0,
				to: 0,
				word: "EIGHT"
		}, {
				from: 0,
				to: 0,
				word: "NINE"
		}, {
				from: 0,
				to: 0,
				word: "ZERO"
		}]
		},
		audioContext,
		container,
		recorder;

	// Add the camera view and append
	d3.html('/view/speech_test.html', function (error, view) {
		// Remove landing page elements and add new content
		d3.select("div#landing").remove();
		document.body.appendChild(view);
		// Add the debug
		container = document.getElementById('speech_container');
		//container.appendChild(feed.canvas);
		d3.select('#start').on('click', function () {
			if (recorder && typeof recorder.start === 'function') {
				// To start recording:
				window.console.log('START RECORDING');
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
	});

	recognizer.onmessage = function (e) {
		var resp = e.data;
		window.console.log(resp);
		if (!recognizer_init){
			recognizer_init = true;
			window.console.log('INITIALIZE');
			// Initialize the recognizer
			recognizer.postMessage({
				command: 'initialize',
				callbackId: 0
			});
		} else if (resp.command === 'initialize') {
			window.console.log('ADD WORDS');
			recognizer.postMessage({
				command: 'addWords',
				data: wordList,
				callbackId: 1
			});
		} else if (resp.id === 1) {
			window.console.log('ADD GRAMMAR');
			recognizer.postMessage({
				command: 'addGrammar',
				data: grammarDigits,
				callbackId: 2
			});
		}
	};
	// Start the worker with a dummy message
	recognizer.postMessage();

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
			if (recognizer) { recorder.consumers.push(recognizer); }
		}
		// Actually call getUserMedia
		if (navigator.getUserMedia) {
			navigator.getUserMedia({
					audio: true
				}, startUserMedia,
				function (e) {
					window.console.log("No live audio input in this browser");
				});
		} else {
			window.console.log("No web audio support in this browser");
		}
		container.innerHTML = 'Ready';
	}
	util.ljs('/js/audioRecorder.js', setup_mic);

	// Load the CSS that we need for our app
	//util.lcss('/css/gh-buttons.css');
}(this));