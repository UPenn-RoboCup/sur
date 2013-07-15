// Ignore IE for now
var ready = false;

self.onmessage = function(e) {
  if (!ready) {
	  ready = true;
		self.postMessage('initialized');
    return;
  }
	self.postMessage(e.data, [e.data]);
	/*
  var uInt8View = new Uint8Array(e.data);
  if (true) { // Transferable
    self.postMessage(uInt8View.buffer, [uInt8View.buffer]);
  } else { // JSON copying
    self.postMessage(e.data);
  }
	*/
};

self.onerror = function(message) {
  self.postMessage('error | '+message);
};
