this.addEventListener('message', function (e) {
	'use strict';
	var obj = e.data,
		zCentimeters = obj.data,
		img = obj.depth_data.data,
		len = zCentimeters.length,
		i,
		j;
	for (i = 0, j = 0; i < len; i += 1, j += 4) {
    var zCm = zCentimeters[i];
		img[j + 3] = 255;
    if (zCm > 8000) {
			img[j] = 255;
			img[j + 1] = 0;
			img[j + 2] = 0;
    } else if (zCm < 200) {
			img[j] = 0;
			img[j + 1] = 0;
			img[j + 2] = 255;
    } else {
      var g = 255 - 255 * (zCm - 200) / (8000 - 200);
			img[j] = 0;
			img[j + 1] = g;
			img[j + 2] = 0;
    }
	}
	obj.data = zCentimeters;
	this.postMessage(obj, [obj.data.buffer, obj.depth_data.data.buffer]);
}, false);
