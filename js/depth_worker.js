var ready = false;
// Set up LUT for real xyz positions
//https://github.com/OpenNI/OpenNI2/blob/master/Source/Core/OniStream.cpp#L362
var hFOV = 58;
var vFOV = 45;
var fr_width = 320;
var fr_height = 240;
// LUT for depth->x,y,z
var hlut;
var vlut;
// X,Y,Z positions
var positions;

var init_lut = function(){
	hlut = new Float32Array( fr_width  );
	vlut = new Float32Array( fr_height );
	for( var i=0;i<fr_width;i++ ){
		hlut[i] = Math.tan(hFOV/2)*2*(i/fr_width -.5); // float?
	}
	for( var j=0;j<fr_height;j++ ){
		vlut[j] = Math.tan(vFOV/2)*2*(j/fr_height-.5); // float math?
	}
	positions = new Float32Array( fr_width * fr_height * 3 )
}

self.onmessage = function(e) {
	if (!ready) {
		ready = true
		init_lut()
		self.postMessage('initialized');
		return;
	}
	var pixels = new Uint8Array(e.data);
	var pixel_idx = 0;
	var x,y,z;
  for(var j=0; j<fr_height; j++ ){
		var tmp_vlut = vlut[j];
    for (var i = 0; i<fr_width; i++ ){
      pixel_idx = pixel_idx+4;
			z = pixels[pixel_idx]
		  x = z*hlut[i];
		  y = z*tmp_vlut;
		}
	}
	self.postMessage(e.data, [e.data]);
};

self.onerror = function(message) {
	self.postMessage('error | '+message);
};
