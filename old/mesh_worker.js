// Do the transforms in a webworker, instead of in the main thread
importScripts('/controllers/transform.js');

self.onmessage = function (e) {
	var el = Transform.make_quads(e.data);
	self.postMessage(el, [el.pos, el.idx, el.col]);
};

self.onerror = function (message) {
	self.postMessage({
		msg: message
	});
};