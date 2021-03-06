this.importScripts('/js/pako_inflate.js');
var zInflate = this.pako.inflate,
	postMessage = this.postMessage;
this.addEventListener('message', function (e) {
	'use strict';
	var obj = e.data,
		label = zInflate(obj.data),
		img = obj.lA_data.data,
		len = label.length,
		i,
		j;
	for (i = 0, j = 0; i < len; i += 1, j += 4) {
		img[j + 3] = 255;
		if (label[i] & 0x01) {
			// Ball
			img[j] = 255;
			img[j + 1] = 0;
			img[j + 2] = 0;
		} else if (label[i] & 0x02) {
			// Yellow goalpost
			img[j] = 255;
			img[j + 1] = 255;
			img[j + 2] = 0;
		} else if (label[i] & 0x04) {
			// Blue goalpost
			img[j] = 0;
			img[j + 1] = 0;
			img[j + 2] = 255;
		} else if (label[i] & 0x08) {
			// Field
			img[j] = 0;
			img[j + 1] = 255;
			img[j + 2] = 0;
		} else if (label[i] & 0x10) {
			// Lines
			img[j] = 255;
			img[j + 1] = 255;
			img[j + 2] = 255;
		} else if (label[i] & 0x20) {
			// Robot Cyan
			img[j] = 0;
			img[j + 1] = 200;
			img[j + 2] = 255;
		} else if (label[i] & 0x40) {
			// Robot Magenta
			img[j] = 255;
			img[j + 1] = 0;
			img[j + 2] = 255;
		} else {
			// Unknown
			img[j] = 0;
			img[j + 1] = 0;
			img[j + 2] = 0;
		}
	}
	// Give the uncompressed data
	obj.data = label;
	(postMessage || this.postMessage)(obj, [obj.data.buffer, obj.lA_data.data.buffer]);
}, false);