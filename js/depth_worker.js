var ready = false;

self.onmessage = function(e) {
  if (!ready) {
	  ready = true;
		self.postMessage('initialized');
    return;
  }
	self.postMessage(e.data, [e.data]);
};

self.onerror = function(message) {
  self.postMessage('error | '+message);
};
