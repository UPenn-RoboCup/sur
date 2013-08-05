var ready = false;
// Set up LUT for real xyz positions
//https://github.com/OpenNI/OpenNI2/blob/master/Source/Core/OniStream.cpp#L362
var fr_width = 480;
var fr_height = 500;
// .25 pixels per degree from the hokuyo
var hFOV = .25 * fr_width  * Math.PI/180;
var vFOV = .25 * fr_height * Math.PI/180;
// LUT for depth->x,y,z
var hlut;
var vlut;

var init_lut = function(){
	hlut = new Float32Array( fr_width  );
	vlut = new Float32Array( fr_height );
	for( var i=0;i<fr_width;i++ ){
		hlut[i] = Math.tan(hFOV/2)*2*(i/fr_width -.5); // float?
	}
	for( var j=0;j<fr_height;j++ ){
		vlut[j] = Math.tan(vFOV/2)*2*(j/fr_height-.5); // float math?
	}
}

self.onmessage = function(e) {
  
	if (!ready) {
		ready = true
		init_lut()
		self.postMessage('initialized');
		return;
	}
	var pixels = new Uint8Array(e.data);
  //self.postMessage(pixels.length);
  
  //return;
	var pixel_idx = 0;
  var position_idx = 0;
	var x,y,z;
  for(var j=0; j<fr_height; j++ ){
		var tmp_vlut = vlut[j];
    for (var i = 0; i<fr_width; i++ ){
      // Compute the xyz
			z = pixels[pixel_idx]
		  x = z * hlut[i];
		  y = z * tmp_vlut;
      // Post into the array
      pixels[pixel_idx] = x;
      pixels[pixel_idx+1] = y;
      pixels[pixel_idx+2] = z;
      // Increment the pixel idx for the next mesh pixel
      pixel_idx = pixel_idx+4;
		}
	}
  //self.postMessage(pixels[1]);
  //return;
	//self.postMessage(e.data, [e.data]);
  self.postMessage(pixels.buffer,[pixels.buffer]);
};

self.onerror = function(message) {
	self.postMessage('error | '+message);
};
