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
var bodyHeight = 0.95;

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

  // make the local vector
  var point = new THREE.Vector4(
    r*Math.cos(h_angle),
    r*Math.sin(h_angle),
    neck_off_axis,
    0
  );
  // make the transform to global
  var local_to_global = new THREE.Matrix4();
  local_to_global.makeRotationY( v_angle );
  // apply transform so that local is now global
  point.applyMatrix4(local_to_global);
  // add the neck height offset from the torso
  point.z = point.z + neck_height;

  // return the global point vector
  return point;
}

var get_hokuyo_chest_xyz = function(u,v,w,width,height,near,far,hFOV,vFOV){
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
  var r = factor*w+near + chest_off_axis;

  // make the local vector
  var point = new THREE.Vector4(
    r*Math.cos(h_angle),
    r*Math.sin(h_angle),
    0,
    0
  );

  // make the transform to global
  var local_to_global = new THREE.Matrix4();
  local_to_global.makeRotationY( v_angle );
  // apply transform so that local is now global
  point.applyMatrix4(local_to_global);
  // add the chest offset from the torso
  point.x = point.x + chest_depth;
  point.z = point.z + chest_height;

  // return the global point vector
  return point;
}