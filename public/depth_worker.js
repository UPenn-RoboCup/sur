var postMessage = this.postMessage;
// Range in meters
var MAX = 8,
	MIN = 0.2,
	RANGE = MAX - MIN;
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
    if (z[i] > 8) {
			img[j] = 255;
			img[j + 1] = 0;
			img[j + 2] = 0;
    } else if (z[i] < 0.2) {
			img[j] = 0;
			img[j + 1] = 0;
			img[j + 2] = 255;
    } else {
			img[j] = 0;
			img[j + 1] = 255 - 255 * (z[i] - MIN) / RANGE;
			img[j + 2] = 0;
    }
	}
	(postMessage || this.postMessage)(obj, [obj.data.buffer, obj.depth_data.data.buffer]);
}, false);
