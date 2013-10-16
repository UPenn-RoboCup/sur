// Find the right host
var host, rest_root, URL;
if(this.document!==undefined){
  host = this.document.location.host.replace(/:.*/, '');
  if( host.length==0 ){ host = "localhost"; }
  // Compatibility layer for URL
  URL = this.URL || this.webkitURL;
  // assume port 8080 for testing...
  rest_root = 'http://'+host+':8080';
}

var jet = function(val){
  //val = Math.min(Math.max(val,0),255);
  // http://www.metastine.com/?p=7
  var fourValue = 4-(4 * val)/255;
  return [ 255*Math.min(fourValue - 1.5, -fourValue + 4.5),
           255*Math.min(fourValue - 0.5, -fourValue + 3.5),
           255*Math.min(fourValue + 0.5, -fourValue + 2.5) ]
}

// convert location
var get_kinect_xyz = function(u,v,w,width,height,near,far,hFOV,vFOV){
  // Convert w of 0-255 to actual meters value
  var factor = (far-near)/255;
  var x = factor*w+near;
  var y = Math.tan(hFOV/2)*2*(u/width-.5)*x;
  var z = Math.tan(vFOV/2)*2*(.5-v/height)*x;
  return new THREE.Vector3( x, y, z );
}

//////////////////
// Robot properties for where the LIDARs are
//////////////////
var chest_depth    = 0.05;
var chest_height   = 0.09;
var chest_off_axis = 0.04;
var neck_height    = 0.30;
var neck_off_axis  = 0.12;
/* robot bodyHeight, but this can change a LOT */
//var bodyHeight = 1.155;
var bodyHeight = 1.02;

var get_hokuyo_head_xyz = function(u,v,w,width,height,near,far,hFOV,vFOV){
  // do not use saturated pixels
  if(w==0||w==255){return;}
  //console.log(u,v,w,width,height,near,far,hFOV,vFOV);
  // radians per pixel
  var h_rpp = hFOV / width;
  var v_rpp = vFOV / height;
  // angle in radians of the selected pixel
  var h_angle = h_rpp * (width/2-u);
  var v_angle = v_rpp * (v-height/2);
  // Convert w of 0-255 to actual meters value
  var factor = (far-near)/255;
  var r = factor*w+near;
  var dx = r * Math.cos(h_angle);
  //
  var x = dx * Math.cos(h_angle) + Math.sin(v_angle)*neck_off_axis;
  var y = r  * Math.sin(h_angle);
  var z = -dx * Math.sin(h_angle) + Math.cos(v_angle)*neck_off_axis + neck_height;

  // return the global point vector
  return [x,y,z,r];
}

var get_hokuyo_chest_xyz = function(u,v,w,width,height,near,far,hFOV,vFOV){
  // do not use saturated pixels
  if(w<5||w>250){return null;}
  // radians per pixel
  var h_rpp = hFOV / width;
  var v_rpp = vFOV / height;
  // angle in radians of the selected pixel
  var h_angle = h_rpp * (width/2-u);
  var v_angle = v_rpp * (height/2-v);
  // Convert w of 0-255 to actual meters value
  var factor = (far-near)/255;
  var r = factor*w+near + chest_off_axis;
  var x = r * Math.cos(v_angle) * Math.cos(h_angle) + chest_depth;
  var y = r * Math.cos(v_angle) * Math.sin(h_angle) + chest_height;
  var z = r * Math.sin(v_angle) + bodyHeight;

  return [x,y,z,r];
}