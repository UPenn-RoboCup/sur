(function (ctx) {
	'use strict';

	var THREE = ctx.THREE,
    cos = Math.cos,
    sin = Math.sin,
    sqrt = Math.sqrt,
    atan = Math.atan,
    DEG_TO_RAD = Math.PI / 180;
  // Arm constants
  var shoulderOffsetX = 0;    
  var shoulderOffsetY = 0.234;
  var shoulderOffsetZ = 0.165;
  var upperArmLength = 0.246;
  var elbowOffsetX = 0.030; 
  //var lowerArmLength = 0.186; // Default 7DOF arm
  var lowerArmLength = 0.250; // LONGARM model
  // Gripper of no appendage - just the plate
  var handOffsetX = 0.245;
  var handOffsetY = 0.035;
  var handOffsetZ = 0;
  // Leg constants
  var hipOffsetX = 0;
  var hipOffsetY = 0.072;
  var hipOffsetZ = 0.282;
  var thighLength = 0.30;
  var tibiaLength = 0.30;
  var kneeOffsetX = 0.03;
  var footHeight = 0.118; // Webots value
  var footToeX = 0.130; // from ankle to toe
  var footHeelX = 0.130; // from ankle to heel
  var dThigh = sqrt(thighLength*thighLength+kneeOffsetX*kneeOffsetX);
  var aThigh = atan(kneeOffsetX/thighLength);
  var dTibia = sqrt(tibiaLength*tibiaLength+kneeOffsetX*kneeOffsetX);
  var aTibia = atan(kneeOffsetX/tibiaLength);

  function fk_leg(q){
	  var c1 = cos(q[0]), s1 = sin(q[0]),
	    c2 = cos(q[1]), s2 = sin(q[1]),
	    c6 = cos(q[5]), s6 = sin(q[5]),
	    q3 = q[2], q4 = q[3], q5 = q[4];
    /*
  	return [
  		[((-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5))*c6 + s1*s6*c2, -((-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5))*s6 + s1*c2*c6, -(-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5), -dThigh*(s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1) - dTibia*(-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))], 
  		[(((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5))*c6 - s6*c1*c2, -(((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5))*s6 - c1*c2*c6, ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) - ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5), -dThigh*(s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3)) - dTibia*((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))], 
  		[((sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*sin(aTibia + q5))*c6 - s2*s6, -((sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*sin(aTibia + q5))*s6 - s2*c6, -(sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*cos(aTibia + q5), -dThigh*c2*cos(aThigh + q3) - dTibia*(sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))],
  		[0, 0, 0, 1]];
    */
    return new THREE.Matrix4(
  		((-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5))*c6 + s1*s6*c2, -((-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5))*s6 + s1*c2*c6, -(-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5), -dThigh*(s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1) - dTibia*(-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4)), 
  		(((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5))*c6 - s6*c1*c2, -(((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5))*s6 - c1*c2*c6, ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) - ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5), -dThigh*(s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3)) - dTibia*((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4)), 
  		((sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*sin(aTibia + q5))*c6 - s2*s6, -((sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*sin(aTibia + q5))*s6 - s2*c6, -(sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*cos(aTibia + q5), -dThigh*c2*cos(aThigh + q3) - dTibia*(sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4)),
  		0, 0, 0, 1
    );
  }
  
  function fk_arm(q){
  	var c1 = cos(q[0]), s1 = sin(q[0]),
  	  c2 = cos(q[1]), s2 = sin(q[1]),
  	  c3 = cos(q[2]), s3 = sin(q[2]),
  	  c4 = cos(q[3]), s4 = sin(q[3]),
  	  c5 = cos(q[4]), s5 = sin(q[4]),
  	  c6 = cos(q[5]), s6 = sin(q[5]),
  	  c7 = cos(q[6]), s7 = sin(q[6]);
    /*
  	return [
  		[(((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*s5 + (s1*s3 - s2*c1*c3)*c5)*s6 + (-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4)*c6, ((((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*s5 + (s1*s3 - s2*c1*c3)*c5)*c6 - (-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4)*s6)*c7 + (((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*c5 - (s1*s3 - s2*c1*c3)*s5)*s7, -((((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*s5 + (s1*s3 - s2*c1*c3)*c5)*c6 - (-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4)*s6)*s7 + (((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*c5 - (s1*s3 - s2*c1*c3)*s5)*c7, -elbowOffsetX*((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2) + elbowOffsetX*(s1*c3 + s2*s3*c1) + lowerArmLength*(-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4) + upperArmLength*c1*c2], 
  		[((s2*s4 - s3*c2*c4)*s5 + c2*c3*c5)*s6 + (s2*c4 + s3*s4*c2)*c6, (((s2*s4 - s3*c2*c4)*s5 + c2*c3*c5)*c6 - (s2*c4 + s3*s4*c2)*s6)*c7 + ((s2*s4 - s3*c2*c4)*c5 - s5*c2*c3)*s7, -(((s2*s4 - s3*c2*c4)*s5 + c2*c3*c5)*c6 - (s2*c4 + s3*s4*c2)*s6)*s7 + ((s2*s4 - s3*c2*c4)*c5 - s5*c2*c3)*c7, -elbowOffsetX*(s2*s4 - s3*c2*c4) - elbowOffsetX*s3*c2 + lowerArmLength*(s2*c4 + s3*s4*c2) + upperArmLength*s2],
  		[(((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*s5 + (s1*s2*c3 + s3*c1)*c5)*s6 + (-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4)*c6, ((((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*s5 + (s1*s2*c3 + s3*c1)*c5)*c6 - (-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4)*s6)*c7 + (((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*c5 - (s1*s2*c3 + s3*c1)*s5)*s7, -((((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*s5 + (s1*s2*c3 + s3*c1)*c5)*c6 - (-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4)*s6)*s7 + (((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*c5 - (s1*s2*c3 + s3*c1)*s5)*c7, -elbowOffsetX*((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2) + elbowOffsetX*(-s1*s2*s3 + c1*c3) + lowerArmLength*(-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4) - upperArmLength*s1*c2],
  		[0, 0, 0, 1]];
    */
  	return new THREE.Matrix4(
      (((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*s5 + (s1*s3 - s2*c1*c3)*c5)*s6 + (-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4)*c6, ((((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*s5 + (s1*s3 - s2*c1*c3)*c5)*c6 - (-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4)*s6)*c7 + (((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*c5 - (s1*s3 - s2*c1*c3)*s5)*s7, -((((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*s5 + (s1*s3 - s2*c1*c3)*c5)*c6 - (-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4)*s6)*s7 + (((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*c5 - (s1*s3 - s2*c1*c3)*s5)*c7, -elbowOffsetX*((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2) + elbowOffsetX*(s1*c3 + s2*s3*c1) + lowerArmLength*(-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4) + upperArmLength*c1*c2, 
  		((s2*s4 - s3*c2*c4)*s5 + c2*c3*c5)*s6 + (s2*c4 + s3*s4*c2)*c6, (((s2*s4 - s3*c2*c4)*s5 + c2*c3*c5)*c6 - (s2*c4 + s3*s4*c2)*s6)*c7 + ((s2*s4 - s3*c2*c4)*c5 - s5*c2*c3)*s7, -(((s2*s4 - s3*c2*c4)*s5 + c2*c3*c5)*c6 - (s2*c4 + s3*s4*c2)*s6)*s7 + ((s2*s4 - s3*c2*c4)*c5 - s5*c2*c3)*c7, -elbowOffsetX*(s2*s4 - s3*c2*c4) - elbowOffsetX*s3*c2 + lowerArmLength*(s2*c4 + s3*s4*c2) + upperArmLength*s2,
  		(((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*s5 + (s1*s2*c3 + s3*c1)*c5)*s6 + (-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4)*c6, ((((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*s5 + (s1*s2*c3 + s3*c1)*c5)*c6 - (-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4)*s6)*c7 + (((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*c5 - (s1*s2*c3 + s3*c1)*s5)*s7, -((((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*s5 + (s1*s2*c3 + s3*c1)*c5)*c6 - (-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4)*s6)*s7 + (((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*c5 - (s1*s2*c3 + s3*c1)*s5)*c7, -elbowOffsetX*((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2) + elbowOffsetX*(-s1*s2*s3 + c1*c3) + lowerArmLength*(-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4) - upperArmLength*s1*c2,
      0, 0, 0, 1
    );
  }
  
  // Forward with respect to the torso
  var preLArm = new THREE.Matrix4().makeTranslation(shoulderOffsetX, shoulderOffsetY, shoulderOffsetZ);
  var postLArm = new THREE.Matrix4().makeTranslation(handOffsetX, -handOffsetY, handOffsetZ);
  function forward_larm (qLArm){
	  return preLArm * fk_arm(qLArm) * postLArm
  }
  var preRArm = new THREE.Matrix4().makeTranslation(shoulderOffsetX, -shoulderOffsetY, shoulderOffsetZ);
  var postRArm = new THREE.Matrix4().makeTranslation(handOffsetX, handOffsetY, handOffsetZ) * new THREE.Matrix4().makeRotationZ(-45*DEG_TO_RAD);
  function forward_rarm (qRArm){
  	return preRArm * fk_arm(qRArm) * postRArm
  }

	function rotateServo(s, v) {
		if (!s || !s.mesh || !s.axel) {
			return;
		}
		var mesh = s.mesh,
			tmp_quat = new THREE.Quaternion();
		mesh.matrixWorldNeedsUpdate = true;
		tmp_quat.setFromAxisAngle(s.axel, v + (s.offset || 0)).multiply(s.rot);
		mesh.setRotationFromQuaternion(tmp_quat);
	}

	// Add the robot components to the scene
	function add_robot(scene, parts, object) {
		var part, parent, mesh,
			mat = new THREE.Matrix4(),
			scale = new THREE.Vector3(1, 1, 1);
		Object.keys(parts).forEach(function (p) {
			part = parts[p];
			mesh = part.mesh;
			mat.compose(part.tr, part.rot, scale);
			mesh.applyMatrix(mat);
			if (part.parent !== undefined) {
				parent = parts[part.parent];
				parent.mesh.add(mesh);
			} else {
				object.add(mesh);
			}
		});
		scene.add(object);
		return object;
	}

	function update(obj, feedback) {
		var i,
			joints = feedback.p,
			torso = feedback.torso,
			servos = obj.servos;
    if (servos === undefined) {
      return;
    }
		for (i = 0; i < servos.length; i += 1) {
			rotateServo(servos[i], joints[i]);
		}
		obj.quaternion.setFromEuler(new THREE.Euler(torso[4], torso[5], torso[3], 'ZXY'));
		obj.position.z = torso[0] * 1e3;
		obj.position.x = torso[1] * 1e3;
		obj.position.y = torso[2] * 1e3;
	}

	function Robot(options) {
		options = options || {};
		THREE = THREE || ctx.THREE; // TODO: Best check for THREE.js? Allow 2D option?
		// The 3D THREE.js scene for the robot
		var scene = options.scene || new THREE.Scene(),
			// Feedback data. TODO: Should not need
			ws = new window.WebSocket('ws://' + window.location.hostname + ':' + (options.port || 9013)),
			// Match the loaded file URL
			stl_root = options.stl_root || "/stl",
			stl_matcher = new RegExp(stl_root + "/(\\S+)\\.stl"),
			robot_material = options.material || new THREE.MeshPhongMaterial({
				// Black knight! http://encycolorpedia.com/313637
				ambient: 0xFDEEF4,
				color: 0x313637,
				specular: 0x111111
			}),
			// Make the robot in the scene graph
			object = new THREE.Object3D(),
			loader,
			STL_MOTOR_WIDTH = 48,
			parts = {},
			servos = [],
			meshes = [];
		// START FUNCTIONS
		// TODO: Functions should be prototype...
		function process_stl(name, geometry) {
			if (name === undefined) {
				return;
			}
			var mesh = new THREE.Mesh(geometry, robot_material),
				part = parts[name],
				is_done = true;
			// Save the mesh in the part
			mesh.name = name;
			part.mesh = mesh;
			// Check if we are done all parts
			Object.keys(parts).forEach(function (p) {
				is_done = is_done && (parts[p].mesh !== undefined);
			});
			// Add the items to the scene if done loading everything
			if (is_done) {
				object = add_robot(scene, parts, object);
				Object.keys(parts).forEach(function (p) {
					part = parts[p];
					mesh = part.mesh;
					meshes.push(mesh);
				});
				object.servos = servos;
			}
		}
		ws.onmessage = function (e) {
			if (typeof e.data !== "string") {
				return;
			}
			update(object, JSON.parse(e.data));
		};
		// END FUNCTIONS

		// TODO: The following should be laoded from JSON
		// Starting position
		//object.position.y = 1000;
		object.name = 'ROBOT';
		// root
		parts.TORSO_PITCH_SERVO = {
			tr: new THREE.Vector3(0, -40, 0),
			rot: new THREE.Quaternion()
		};
		parts.PELVIS = {
			tr: new THREE.Vector3(0, -128, 0),
			rot: new THREE.Quaternion()
		};
		parts.CHEST = {
			tr: new THREE.Vector3(0, 170, 0),
			rot: new THREE.Quaternion()
		};
		// Head
		parts.NECK = {
			parent: 'CHEST',
			tr: new THREE.Vector3(0, 40, 0),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(0, 1, 0)
		};
		parts.CAM = {
			parent: 'NECK',
			tr: new THREE.Vector3(0, 111, 0),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(1, 0, 0)
		};
		// RArm
		parts.RIGHT_SHOULDER_PITCH = {
			parent: 'CHEST',
			tr: new THREE.Vector3(STL_MOTOR_WIDTH - 234, 0, 0),
			rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), -Math.PI / 2),
			axel: new THREE.Vector3(1, 0, 0),
			offset: -Math.PI / 2
		};
		parts.RIGHT_SHOULDER_ROLL = {
			parent: 'RIGHT_SHOULDER_PITCH',
			tr: new THREE.Vector3(0, -STL_MOTOR_WIDTH, STL_MOTOR_WIDTH / 2),
			rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), Math.PI / 2),
			axel: new THREE.Vector3(0, 0, 1)
		};
		parts.RIGHT_ARM = {
			parent: 'RIGHT_SHOULDER_ROLL',
			tr: new THREE.Vector3(0, -STL_MOTOR_WIDTH / 2, -STL_MOTOR_WIDTH / 2),
			rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), Math.PI),
			axel: new THREE.Vector3(0, -1, 0)
		};
		parts.INTER_RIGHT_ELBOW = {
			parent: 'RIGHT_ARM',
			mesh: new THREE.Object3D(),
			tr: new THREE.Vector3(0, -246 + STL_MOTOR_WIDTH / 2, -STL_MOTOR_WIDTH / 2),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(-1, 0, 0)
		};
		parts.RIGHT_ELBOW = {
			parent: 'INTER_RIGHT_ELBOW',
			tr: new THREE.Vector3(0, 0, STL_MOTOR_WIDTH / 2),
			rot: new THREE.Quaternion()
		};
		parts.RIGHT_WRIST = {
			parent: 'RIGHT_ELBOW',
			tr: new THREE.Vector3(0, -250, 0),
      rot: new THREE.Quaternion(),//(new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), -Math.PI / 2),
      axel: new THREE.Vector3(0, -1, 0),
		};
		// LArm
		parts.LEFT_SHOULDER_PITCH = {
			parent: 'CHEST',
			tr: new THREE.Vector3(234 - STL_MOTOR_WIDTH, 0, 0),
			rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), Math.PI / 2),
			axel: new THREE.Vector3(1, 0, 0),
			offset: -Math.PI / 2
		};
		parts.LEFT_SHOULDER_ROLL = {
			parent: 'LEFT_SHOULDER_PITCH',
			tr: new THREE.Vector3(0, -STL_MOTOR_WIDTH, STL_MOTOR_WIDTH / 2),
			rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), -Math.PI / 2),
			axel: new THREE.Vector3(0, 0, 1)
		};
		parts.LEFT_ARM = {
			parent: 'LEFT_SHOULDER_ROLL',
			tr: new THREE.Vector3(0, -STL_MOTOR_WIDTH / 2, -STL_MOTOR_WIDTH / 2),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(0, -1, 0)
		};
		parts.INTER_LEFT_ELBOW = {
			parent: 'LEFT_ARM',
			mesh: new THREE.Object3D(),
			tr: new THREE.Vector3(0, -246 + STL_MOTOR_WIDTH / 2, STL_MOTOR_WIDTH / 2),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(1, 0, 0)
		};
		parts.LEFT_ELBOW = {
			parent: 'INTER_LEFT_ELBOW',
			tr: new THREE.Vector3(0, 0, -STL_MOTOR_WIDTH / 2),
			rot: new THREE.Quaternion()
		};
		parts.LEFT_WRIST = {
			parent: 'LEFT_ELBOW',
			tr: new THREE.Vector3(0, -250, 0),
			rot: new THREE.Quaternion(),//(new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), Math.PI / 2),
      axel: new THREE.Vector3(0, -1, 0)
		};
		// RLeg
		parts.RIGHT_HIP_YAW = {
			parent: 'PELVIS',
			tr: new THREE.Vector3(-72, -16 - 64, 0),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(0, 1, 0)
		};
		parts.RIGHT_HIP_ROLL = {
			parent: 'RIGHT_HIP_YAW',
			tr: new THREE.Vector3(0, -64, 0),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(0, 0, 1)
		};
		parts.R_THIGH = {
			parent: 'RIGHT_HIP_ROLL',
			tr: new THREE.Vector3(),
			rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), Math.PI),
			axel: new THREE.Vector3(1, 0, 0)
		};
		parts.INTER_RIGHT_KNEE = {
			parent: 'R_THIGH',
			mesh: new THREE.Object3D(),
			tr: new THREE.Vector3(0, -300, STL_MOTOR_WIDTH / 2),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(-1, 0, 0)
		};
		parts.R_LEG = {
			parent: 'INTER_RIGHT_KNEE',
			tr: new THREE.Vector3(0, 0, -STL_MOTOR_WIDTH / 2),
			rot: new THREE.Quaternion()
		};
		parts.RIGHT_ANKLE = {
			parent: 'R_LEG',
			tr: new THREE.Vector3(0, -300, 0),
			rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), Math.PI),
			axel: new THREE.Vector3(-1, 0, 0)
		};
		parts.RIGHT_FOOT = {
			parent: 'RIGHT_ANKLE',
			tr: new THREE.Vector3(),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(0, 0, 1)
		};
		// LLeg
		parts.LEFT_HIP_YAW = {
			parent: 'PELVIS',
			tr: new THREE.Vector3(72, -16 - 64, 0),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(0, 1, 0)
		};
		parts.LEFT_HIP_ROLL = {
			parent: 'LEFT_HIP_YAW',
			tr: new THREE.Vector3(0, -64, 0),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(0, 0, 1)
		};
		parts.L_THIGH = {
			parent: 'LEFT_HIP_ROLL',
			tr: new THREE.Vector3(),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(1, 0, 0)
		};
		parts.INTER_LEFT_KNEE = {
			parent: 'L_THIGH',
			mesh: new THREE.Object3D(),
			tr: new THREE.Vector3(0, -300, -STL_MOTOR_WIDTH / 2),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(1, 0, 0)
		};
		parts.L_LEG = {
			parent: 'INTER_LEFT_KNEE',
			tr: new THREE.Vector3(0, 0, STL_MOTOR_WIDTH / 2),
			rot: new THREE.Quaternion()
		};
		parts.LEFT_ANKLE = {
			parent: 'L_LEG',
			tr: new THREE.Vector3(0, -300, 0),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(1, 0, 0)
		};
		parts.LEFT_FOOT = {
			parent: 'LEFT_ANKLE',
			tr: new THREE.Vector3(),
			rot: new THREE.Quaternion(),
			axel: new THREE.Vector3(0, 0, 1)
		};
		// Servo configuration
		servos.push(parts.NECK);
		servos.push(parts.CAM);
		// left arm
		servos.push(parts.LEFT_SHOULDER_PITCH);
		servos.push(parts.LEFT_SHOULDER_ROLL);
		servos.push(parts.LEFT_ARM);
		servos.push(parts.INTER_LEFT_ELBOW);
		servos.push(parts.LEFT_WRIST);
		servos.push(null);
		servos.push(null);
		// left leg
		servos.push(parts.LEFT_HIP_YAW);
		servos.push(parts.LEFT_HIP_ROLL);
		servos.push(parts.L_THIGH);
		servos.push(parts.INTER_LEFT_KNEE);
		servos.push(parts.LEFT_ANKLE);
		servos.push(parts.LEFT_FOOT);
		// right leg
		servos.push(parts.RIGHT_HIP_YAW);
		servos.push(parts.RIGHT_HIP_ROLL);
		servos.push(parts.R_THIGH);
		servos.push(parts.INTER_RIGHT_KNEE);
		servos.push(parts.RIGHT_ANKLE);
		servos.push(parts.RIGHT_FOOT);
		// right arm
		servos.push(parts.RIGHT_SHOULDER_PITCH);
		servos.push(parts.RIGHT_SHOULDER_ROLL);
		servos.push(parts.RIGHT_ARM);
		servos.push(parts.INTER_RIGHT_ELBOW);
		servos.push(parts.RIGHT_WRIST);
		servos.push(null);
		servos.push(null);

		// Setup routine
		function setup() {
			loader = new THREE.STLLoader();
			loader.addEventListener('load', function (event) {
				process_stl(event.url.match(stl_matcher)[1], event.content);
			});
			Object.keys(parts).forEach(function (part) {
				if (parts[part].mesh === undefined) {
					loader.load(stl_root + '/' + part + '.stl');
				}
			});
		}

		// Setup in the world
		if (THREE.STLLoader) {
			setTimeout(setup);
		} else {
			ctx.util.ljs('/STLLoader.js', setup);
		}

		// Export the THREE object for use
		this.object = object;
		this.meshes = meshes;
		this.parts = parts;
    this.forward_larm = forward_larm;
    this.forward_rarm = forward_rarm;
	}

	ctx.Robot = Robot;

}(this));
