var postMessage = this.postMessage;
// Range in meters (or centimeters...)
var MAX = 8000, //8,
	MIN = 200, //0.2,
	RANGE = MAX - MIN,
	fourValue,
	min = Math.min;
this.addEventListener('message', function (e) {
	'use strict';
	var obj = e.data,
		z = obj.data,
		img = obj.depth_data.data,
		len = z.length,
		i,
		j;
	for (i = 0, j = 0; i < len; i += 1, j += 4) {
		img[j + 3] = 255;
    if (z[i] < MIN) {
			img[j] = 0;
			img[j + 1] = 0;
			img[j + 2] = 0;
    } else if (z[i] > MAX) {
			img[j] = 255;
			img[j + 1] = 255;
			img[j + 2] = 255;
    } else {
			fourValue = 4 - (4 * (z[i] - MIN) / RANGE);
			img[j] = 255 * min(fourValue - 1.5, 4.5 - fourValue);
			img[j + 1] = 255 * min(fourValue - 0.5, 3.5 - fourValue);
			img[j + 2] = 255 * min(fourValue + 0.5, 2.5 - fourValue);
    }
	}
	(postMessage || this.postMessage)(obj, [obj.data.buffer, obj.depth_data.data.buffer]);
}, false);
