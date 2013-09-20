var ready = false;
// Set up LUT for real xyz positions
//https://github.com/OpenNI/OpenNI2/blob/master/Source/Core/OniStream.cpp#L362
var hFOV = 58*Math.PI/180;
var vFOV = 45*Math.PI/180;
// LUT for depth->x,y,z
var hlut;
var vlut;
var near = .5, far = 2;
var factor;

var init_lut = function(width,height){
	hlut = new Float32Array( width  );
	vlut = new Float32Array( height );
	for( var i=0;i<width;i++ ) {
		hlut[i] = Math.tan(hFOV/2)*2*(i/width-.5);
	}
	for( var j=0;j<height;j++ ) {
		vlut[j] = Math.tan(vFOV/2)*2*(j/height-.5);
	}
}

self.onmessage = function(e) {
	if (!ready) {
		// TODO: get the width/height here
		init_lut(320,240);
		// TODO: get the near/far
		factor = (far-near)/255;
		ready = true;
		self.postMessage('initialized');
		return;
	}
	// grab the width and height
	var width  = hlut.length;
	var height = vlut.length;
	// wrap the incoming array (reference passed to us)
	var pixels = new Uint8Array(e.data);
	// new array! will pass by reference to the main script
	var positions = new Float32Array( width * height * 3 )
	// indexing
	var pixel_idx = 0, pos_idx = 0;
	var x,y,z;
	for(var j=0; j<height; j++ ){
		var tmp_vlut = vlut[j];
		for (var i = 0; i<width; i++ ){
			//x = (pixels[pixel_idx]<<shift_amt) / 1000.0;
			d = pixels[pixel_idx];
			if (d<255 && d>0){
				x = factor*d+near;
				y = hlut[i]  * x;
				z = tmp_vlut * x;
				positions[pos_idx] = x;
				positions[pos_idx+1] = y;
				positions[pos_idx+2] = z;
			} else {
		        positions[pos_idx]   = -100000; //100m away
		        positions[pos_idx+1] = 0;
		        positions[pos_idx+2] = 0;
			}
			pixel_idx += 4;
			pos_idx   += 3;
		}
	}
	// pass by reference
	self.postMessage(positions.buffer, [positions.buffer]);
};

self.onerror = function(message) {
	self.postMessage('error | '+message);
};
