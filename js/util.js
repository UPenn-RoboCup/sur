// Useful (globally accessible) functions
if(this.document!==undefined){
  this.host = this.document.location.host.replace(/:.*/, '');
  if( host.length==0 ){ host = "localhost"; }
  // Compatibility layer for URL
  this.URL = this.URL || this.webkitURL;
  // assume port 8080 for testing...
  this.rest_root = 'http://'+host+':8080';
  // http://macwright.org/presentations/dcjq/
  this.$ = function(x){return document.querySelectorAll(x);};
  this.clicker = function(id,fun){
    document.getElementById(id).addEventListener('click', fun, false);
  }
  this.unclicker = function(id,fun){
    document.getElementById(id).removeEventListener('click', fun, false);
  }
}

//////////////////
// Robot properties for where the LIDARs are
//////////////////
var chest_height   = 0.10;
var chest_joint_x  = 0.05;
var chest_offset_x = 0.01;
var chest_off_axis = 0.0; // no need... (lidar reception off axis)
//
var neck_height    = 0.30;
var neck_off_axis  = 0.12;
/* robot bodyHeight, but this can change a LOT */
var bodyTilt = 11*Math.PI/180;
var bodyHeight = 0.9285318; // nominal height
var supportX = 0.0515184 + 0.01;
//
var robot_pose = [0,0,0];

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

var get_hokuyo_head_xyz = function(u,v,w,width,height,near,far,hFOV,vFOV,pitch){
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
  
  // rotate for pitch compensation
  var cp = Math.cos(pitch);
  var sp = Math.sin(pitch);
  var xx = cp*x + sp*z;
  var zz = -sp*x + cp*z;

  // return the global point vector
  return [xx,y,zz,r];
}

var get_hokuyo_chest_xyz = function(u,v,w,width,height,near,far,fov,pitch,pose){
  // do not use saturated pixels
  if(w==0||w==255){return;}
  
  // Convert w of 0-255 to actual meters value
  var factor = (far-near)/255;
  var r = factor*w + near + chest_off_axis;
  
  // bodyTilt compensation (should be pitch in the future)
  var cp = Math.cos(pitch);
  var sp = Math.sin(pitch);
  
  // radians per pixel
  var hFOV  = fov[1]-fov[0];
  var h_rpp = hFOV / width;
  var h_angle = h_rpp * (width/2-u);
  var ch = Math.cos(h_angle);
  var sh = Math.sin(h_angle);
  
  // Radians per pixel
  var vFOV  = fov[3]-fov[2];
  var v_rpp = vFOV / height;
  var v_angle = v_rpp * v + fov[2];
  var cv = Math.cos(v_angle);
  var sv = Math.sin(-1*v_angle);
  
  // default
  var x = (r * cv + chest_offset_x) * ch + chest_joint_x;
  var y = r * cv * sh;
  var z = r * sv + chest_height;
  
  // rotate for pitch compensation
  var xx =  cp*x + sp*z + supportX;
  var zz = -sp*x + cp*z + bodyHeight;
  
  // Place into global pose
  var px = pose[0];
  var py = pose[1];
  var pa = pose[2];
  var ca = Math.cos(pa);
  var sa = Math.sin(pa);
  return [ px + ca*xx-sa*y, py + sa*xx+ca*y, zz, r]; 
}

// get a global point, and put it in the torso reference frame
var point_to_torso = function(x,y,z){
  // Make a relative pose
  var ca = Math.cos(robot_pose[2]);
  var sa = Math.sin(robot_pose[2]);
  var px = x-robot_pose[0];
  var py = y-robot_pose[1];
  x =  ca*px + sa*py;
  y = -sa*px + ca*py;
  /*
  var pa = (z-robot_pose[2]) % (2*math.pi);
  if (pa >= Math.PI){pa = pa - 2*Math.PI;}
  */
  
  // kill off some body transformations
  z -= bodyHeight;
  x -= supportX;
  
  // Invert bodyTilt
  var cp = Math.cos(bodyTilt);
  var sp = Math.sin(bodyTilt);
  // rotate for pitch compensation
  var xx = cp*x - sp*z;
  var zz = sp*x + cp*z;
  
  // More body transformations
  xx -= chest_joint_x;
  zz -= chest_height;
  
  return [xx,y,zz];
}