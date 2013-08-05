var ready = false;
// Set up LUT for real xyz positions
//https://github.com/OpenNI/OpenNI2/blob/master/Source/Core/OniStream.cpp#L362
var fr_width = 480;
var fr_height = 500;

/*
// radians per pixel
var hRPP = .25 * Math.PI/180;
var vRPP = 1 / fr_width;
var lut_h_x, lut_v_x, lut_h_y, lut_v_y, lut_h_z, lut_v_z;
*/


var hFOV = 1;
var vFOV = 125 * Math.PI/180;
// LUT for depth->x,y,z
var hlut;
var vlut;


var init_lut = function(){
  /*
	lut_h_x = new Float32Array( fr_width  );
	lut_v_x = new Float32Array( fr_height );
	lut_h_y = new Float32Array( fr_width  );
	lut_v_y = new Float32Array( fr_height );
	lut_h_z = new Float32Array( fr_width  );
	lut_v_z = new Float32Array( fr_height );
  var phi;
	for( var i=0; i<fr_width; i++ ){
    phi = (i-fr_width/2) * hRPP;
    lut_h_x[i] = Math.cos(phi);
    lut_h_y[i] = Math.sin(phi);
    lut_h_z[i] = 1;
	}
  var theta;
	for( var j = 0; j<fr_height; j++ ){
    theta = (j-fr_height/2) * vRPP;
    lut_v_x[j] = Math.sin(theta);
    lut_v_y[j] = Math.sin(theta);
    lut_v_z[j] = Math.cos(theta);
	}
  */
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
		init_lut();
		self.postMessage('initialized');
		return;
	}
	// Array to be put into the WebGL buffer
  var positions = new Float32Array( fr_width * fr_height * 3 );
  
  var pixels    = new Uint8Array(e.data);
	var pixel_idx    = 0;
  var position_idx = 0;

	var x,y,z,d,vlut_tmp;
  //var hx,hy,hz;
  for(var j=0; j<fr_height; j++ ){
    /*
    hx = lut_v_x[j];
    hy = lut_v_y[j];
    hz = lut_v_z[j];
    */
    vlut_tmp = vlut[j];
    for (var i = 0; i<fr_width; i++ ){
      // Compute the xyz
      d = pixels[pixel_idx];
      if (d<253){
        /*
  		  x = d * hx * lut_h_x[i];
  		  y = d * hy * lut_h_y[i];
        z = d * hz * lut_h_z[i];
  			*/
        z = d
  		  x = z*hlut[i];
  		  y = z*vlut_tmp;
        
        // Post into the array
        // Our x is their z
        // 
        positions[position_idx]   = x;
        positions[position_idx+1] = z;
        positions[position_idx+2] = y;        
      } else {
        positions[position_idx]   = 0;
        positions[position_idx+1] = 0;
        positions[position_idx+2] = 0;
      }
      // Increment the pixel idx for the next mesh pixel
      pixel_idx += 4;
      position_idx += 3;
		}
	}
  //self.postMessage(pixels.buffer,[pixels.buffer]);
  self.postMessage(positions.buffer,[positions.buffer]);
};

self.onerror = function(message) {
	self.postMessage('error | '+message);
};
