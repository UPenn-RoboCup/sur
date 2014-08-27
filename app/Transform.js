(function (ctx) {
	'use strict';

	function Transform() {}

	var cos = Math.cos,
		sin = Math.sin;
	
	// Add camera projection

	// get a global (THREEjs) point, and put it in the torso reference frame
	function three_to_torso(p, robot) {
		// Scale the point
		var z = p.y / 1000 - robot.bodyHeight || 1,
			ca = cos(robot.pa),
			sa = sin(robot.pa),
			px = p.z / 1000 - robot.px || 0,
			py = p.x / 1000 - robot.py || 0,
			x = ca * px + sa * py,
			y = -sa * px + ca * py;
		//x -= robot.supportX;

		// Invert bodyTilt
		//var bodyTilt = -1*robot.bodyTilt || 3 * DEG_TO_RAD;
		//var cp = cos(bodyTilt);
		//var sp = sin(bodyTilt);
		//var xx =  cp*x + sp*z;
		//var zz = -sp*x + cp*z;
		// Yield the torso coordinates

		return [x, y, z];
	}

	// export
	Transform.three_to_torso = three_to_torso;
	ctx.Transform = Transform;

}(this));