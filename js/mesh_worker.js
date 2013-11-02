// Do the transforms in a webworker, instead of in the main thread
importScripts('../js/transform.js');

self.onmessage = function(e) {
  var el = make_quads(e.data);
  self.postMessage(el,[el.pos, el.idx, el.col]);
};

self.onerror = function(message) {
  var obj = {}
  obj.msg = message;
	self.postMessage(obj);
};