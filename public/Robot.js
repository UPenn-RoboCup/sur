(function (ctx) {
	'use strict';

	var THREE = ctx.THREE,
		jointNames = ctx.util.jointNames;

/*
var cos = Math.cos,
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

	function fk_leg0(q){
		var c1 = cos(q[0]), s1 = sin(q[0]),
	    c2 = cos(q[1]), s2 = sin(q[1]),
	    c6 = cos(q[5]), s6 = sin(q[5]),
	    q3 = q[2], q4 = q[3], q5 = q[4];
		  	return [
  		[((-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5))*c6 + s1*s6*c2, -((-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5))*s6 + s1*c2*c6, -(-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5), -dThigh*(s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1) - dTibia*(-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))],
  		[(((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5))*c6 - s6*c1*c2, -(((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5))*s6 - c1*c2*c6, ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) - ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5), -dThigh*(s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3)) - dTibia*((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))],
  		[((sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*sin(aTibia + q5))*c6 - s2*s6, -((sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*sin(aTibia + q5))*s6 - s2*c6, -(sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*cos(aTibia + q5), -dThigh*c2*cos(aThigh + q3) - dTibia*(sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))],
  		[0, 0, 0, 1]];
	}

  function fk_leg(q){
	  var c1 = cos(q[0]), s1 = sin(q[0]),
	    c2 = cos(q[1]), s2 = sin(q[1]),
	    c6 = cos(q[5]), s6 = sin(q[5]),
	    q3 = q[2], q4 = q[3], q5 = q[4];
    return new THREE.Matrix4(
  		((-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5))*c6 + s1*s6*c2, -((-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5))*s6 + s1*c2*c6, -(-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5), -dThigh*(s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1) - dTibia*(-(-s1*s2*sin(aThigh + q3) + c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*s2*cos(aThigh + q3) + sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4)),
  		(((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5))*c6 - s6*c1*c2, -(((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*cos(aTibia + q5))*s6 - c1*c2*c6, ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*sin(aThigh + aTibia - q4) + (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) - ((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4))*sin(aTibia + q5), -dThigh*(s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3)) - dTibia*((s1*sin(aThigh + q3) - s2*c1*cos(aThigh + q3))*cos(aThigh + aTibia - q4) - (s1*cos(aThigh + q3) + s2*sin(aThigh + q3)*c1)*sin(aThigh + aTibia - q4)),
  		((sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*sin(aTibia + q5))*c6 - s2*s6, -((sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*cos(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*sin(aTibia + q5))*s6 - s2*c6, -(sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4))*sin(aTibia + q5) + (-sin(aThigh + q3)*c2*cos(aThigh + aTibia - q4) + sin(aThigh + aTibia - q4)*c2*cos(aThigh + q3))*cos(aTibia + q5), -dThigh*c2*cos(aThigh + q3) - dTibia*(sin(aThigh + q3)*sin(aThigh + aTibia - q4)*c2 + c2*cos(aThigh + q3)*cos(aThigh + aTibia - q4)),
  		0, 0, 0, 1
    );
  }


	function fk_arm0(q){
		var c1 = cos(q[0]), s1 = sin(q[0]),
  	  c2 = cos(q[1]), s2 = sin(q[1]),
  	  c3 = cos(q[2]), s3 = sin(q[2]),
  	  c4 = cos(q[3]), s4 = sin(q[3]),
  	  c5 = cos(q[4]), s5 = sin(q[4]),
  	  c6 = cos(q[5]), s6 = sin(q[5]),
  	  c7 = cos(q[6]), s7 = sin(q[6]);
		return [
  		[(((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*s5 + (s1*s3 - s2*c1*c3)*c5)*s6 + (-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4)*c6, ((((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*s5 + (s1*s3 - s2*c1*c3)*c5)*c6 - (-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4)*s6)*c7 + (((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*c5 - (s1*s3 - s2*c1*c3)*s5)*s7, -((((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*s5 + (s1*s3 - s2*c1*c3)*c5)*c6 - (-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4)*s6)*s7 + (((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2)*c5 - (s1*s3 - s2*c1*c3)*s5)*c7, -elbowOffsetX*((s1*c3 + s2*s3*c1)*c4 + s4*c1*c2) + elbowOffsetX*(s1*c3 + s2*s3*c1) + lowerArmLength*(-(s1*c3 + s2*s3*c1)*s4 + c1*c2*c4) + upperArmLength*c1*c2],
  		[((s2*s4 - s3*c2*c4)*s5 + c2*c3*c5)*s6 + (s2*c4 + s3*s4*c2)*c6, (((s2*s4 - s3*c2*c4)*s5 + c2*c3*c5)*c6 - (s2*c4 + s3*s4*c2)*s6)*c7 + ((s2*s4 - s3*c2*c4)*c5 - s5*c2*c3)*s7, -(((s2*s4 - s3*c2*c4)*s5 + c2*c3*c5)*c6 - (s2*c4 + s3*s4*c2)*s6)*s7 + ((s2*s4 - s3*c2*c4)*c5 - s5*c2*c3)*c7, -elbowOffsetX*(s2*s4 - s3*c2*c4) - elbowOffsetX*s3*c2 + lowerArmLength*(s2*c4 + s3*s4*c2) + upperArmLength*s2],
  		[(((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*s5 + (s1*s2*c3 + s3*c1)*c5)*s6 + (-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4)*c6, ((((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*s5 + (s1*s2*c3 + s3*c1)*c5)*c6 - (-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4)*s6)*c7 + (((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*c5 - (s1*s2*c3 + s3*c1)*s5)*s7, -((((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*s5 + (s1*s2*c3 + s3*c1)*c5)*c6 - (-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4)*s6)*s7 + (((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2)*c5 - (s1*s2*c3 + s3*c1)*s5)*c7, -elbowOffsetX*((-s1*s2*s3 + c1*c3)*c4 - s1*s4*c2) + elbowOffsetX*(-s1*s2*s3 + c1*c3) + lowerArmLength*(-(-s1*s2*s3 + c1*c3)*s4 - s1*c2*c4) - upperArmLength*s1*c2],
  		[0, 0, 0, 1]];
	}

  function fk_arm(q){
  	var c1 = cos(q[0]), s1 = sin(q[0]),
  	  c2 = cos(q[1]), s2 = sin(q[1]),
  	  c3 = cos(q[2]), s3 = sin(q[2]),
  	  c4 = cos(q[3]), s4 = sin(q[3]),
  	  c5 = cos(q[4]), s5 = sin(q[4]),
  	  c6 = cos(q[5]), s6 = sin(q[5]),
  	  c7 = cos(q[6]), s7 = sin(q[6]);
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
	  return preLArm * fk_arm(qLArm) * postLArm;
  }
  var preRArm = new THREE.Matrix4().makeTranslation(shoulderOffsetX, -shoulderOffsetY, shoulderOffsetZ);
  var postRArm = new THREE.Matrix4().makeTranslation(handOffsetX, handOffsetY, handOffsetZ) * new THREE.Matrix4().makeRotationZ(-45*DEG_TO_RAD);
  function forward_rarm (qRArm){
  	return preRArm * fk_arm(qRArm) * postRArm;
  }
	*/

	var xAxis = new THREE.Vector3( 1, 0, 0 );

	function Robot(options) {
		var loader = new THREE.ObjectLoader(),
			object, meshes, qDefault,
			ws;
		if(options.port){
			ws = new window.WebSocket('ws://' + window.location.hostname + ':' + options.port);
			ws.onmessage = function (e) {
				if (typeof e.data !== "string") { return; }
				var feedback = JSON.parse(e.data);
				var joints = feedback.p;
				var qQuat = joints.map(function(q){
					return new THREE.Quaternion().setFromAxisAngle(xAxis, q);
				});
				meshes.forEach(function(m, i){
					if(!m){return;}
					m.quaternion.multiplyQuaternions(qDefault[i], qQuat[i]);
					m.matrixWorldNeedsUpdate = true;
				});
				var torso = feedback.u;
				object.quaternion.setFromEuler(new THREE.Euler(torso[4], torso[5], torso[3], 'ZXY'));
				object.position.z = torso[0] * 1e3;
				object.position.x = torso[1] * 1e3;
				object.position.y = torso[2] * 1e3;
			};
		}

		// assuming we loaded a JSON structure from elsewhere
		loader.load('json/thorop2.json', function(o){
			//console.log('THOROP2', object, this);
			object = o;
			meshes = jointNames.map(function(name){return o.getObjectByName(name) || new THREE.Object3D();});
			qDefault = meshes.map(function(m){
				return m.quaternion.clone();
			});
			this.meshes = meshes;
			this.object = object;
			this.qDefault = qDefault;
			if(options.callback){setTimeout(options.callback.bind(o),0);}
		}.bind(this));

		/*
    this.forward_larm = forward_larm;
    this.forward_rarm = forward_rarm;
		*/
	}

	ctx.Robot = Robot;

}(this));
