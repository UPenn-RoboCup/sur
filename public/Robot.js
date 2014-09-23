(function (ctx) {
	'use strict';
	var THREE = ctx.THREE,
		// Scene exported from mesh_scene. TODO: Check this!
		scene = ctx.SCENE || new THREE.Scene(),
		robot = new THREE.Object3D(),
		loader = new THREE.STLLoader(),
		// Match the loaded file URL
		stl_matcher = new RegExp("/stl/(\\S+)\\.stl"),
		// Feedback data
		ws = new window.WebSocket('ws://' + window.location.hostname + ':' + 9013),
		robot_material = new THREE.MeshPhongMaterial({
			// Black knight! http://encycolorpedia.com/313637
			ambient: 0xFDEEF4,
			color: 0x313637,
			specular: 0x111111
		}),
		STL_MOTOR_WIDTH = 48,
		parts = {},
		servos = [],
		part_keys,
		tmp_quat = new THREE.Quaternion();
	// Add the robot components to the scene
	function augment_scene() {
		var part, parent, mesh,
			mat = new THREE.Matrix4(),
			scale = new THREE.Vector3(1, 1, 1);
		part_keys.forEach(function (p) {
			part = parts[p];
			mesh = part.mesh;
			mat.compose(part.tr, part.rot, scale);
			mesh.applyMatrix(mat);
			if (part.parent !== undefined) {
				parent = parts[part.parent];
				parent.mesh.add(mesh);
			} else {
				robot.add(mesh);
			}
		});
		scene.add(robot);
	}
	// Handle the STL loads
	loader.addEventListener('load', function (event) {
		var geometry = event.content,
			part_name = event.url.match(stl_matcher)[1],
			part,
			is_done = true,
			mesh;
		if (part_name === undefined) {
			return;
		}
		mesh = new THREE.Mesh(geometry, robot_material);
		part = parts[part_name];
		part.mesh = mesh;
		// Check if we are done
		part_keys.forEach(function (p) {
			is_done = is_done && (parts[p].mesh !== undefined);
		});
		// Add the items to the scene if
		if (is_done) {
			setTimeout(augment_scene, 0);
		}
	});
	function rotateServo(s, v) {
		if (!s || !s.mesh || !s.axel) {
			return;
		}
		var mesh = s.mesh;
		mesh.matrixWorldNeedsUpdate = true;
		tmp_quat.setFromAxisAngle(s.axel, v + (s.offset || 0)).multiply(s.rot);
		mesh.setRotationFromQuaternion(tmp_quat);
	}
	ws.onmessage = function (e) {
		if (typeof e.data !== "string") {
			return;
		}
		var feedback = JSON.parse(e.data),
			joints = feedback.joints,
			i;
		for (i = 0; i < servos.length; i += 1) {
			rotateServo(servos[i], joints[i]);
		}
		//window.console.log(feedback);
	};
	
	/* RUN THE SETUP CODE*/
	// Starting position
	robot.translateY(1000);
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
		axel: new THREE.Vector3(0, 1, 0)
	};
	parts.INTER_RIGHT_ELBOW = {
		parent: 'RIGHT_ARM',
		mesh: new THREE.Object3D(),
		tr: new THREE.Vector3(0, -246 + STL_MOTOR_WIDTH / 2, STL_MOTOR_WIDTH / 2),
		rot: new THREE.Quaternion(),
		axel: new THREE.Vector3(-1, 0, 0)
	};
	parts.RIGHT_ELBOW = {
		parent: 'INTER_RIGHT_ELBOW',
		tr: new THREE.Vector3(0, 0, -STL_MOTOR_WIDTH / 2),
		rot: new THREE.Quaternion()
	};
	parts.RIGHT_WRIST = {
		parent: 'RIGHT_ELBOW',
		tr: new THREE.Vector3(0, -250, 0),
		rot: new THREE.Quaternion()
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
		axel: new THREE.Vector3(0, 1, 0)
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
		rot: new THREE.Quaternion()
	};
	// RLeg
	parts.RIGHT_HIP_YAW = {
		parent: 'PELVIS',
		tr: new THREE.Vector3(-72, -16 - 64, 0),
		rot: new THREE.Quaternion()
	};
	parts.RIGHT_HIP_ROLL = {
		parent: 'RIGHT_HIP_YAW',
		tr: new THREE.Vector3(0, -64, 0),
		rot: new THREE.Quaternion()
	};
	parts.R_THIGH = {
		parent: 'RIGHT_HIP_ROLL',
		tr: new THREE.Vector3(),
		rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), Math.PI)
	};
	parts.R_LEG = {
		parent: 'R_THIGH',
		tr: new THREE.Vector3(0, -300, 0),
		rot: new THREE.Quaternion()
	};
	parts.RIGHT_ANKLE = {
		parent: 'R_LEG',
		tr: new THREE.Vector3(0, -300, 0),
		rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), Math.PI)
	};
	parts.RIGHT_FOOT = {
		parent: 'RIGHT_ANKLE',
		tr: new THREE.Vector3(),
		rot: new THREE.Quaternion()
	};
	// LLeg
	parts.LEFT_HIP_YAW = {
		parent: 'PELVIS',
		tr: new THREE.Vector3(72, -16 - 64, 0),
		rot: new THREE.Quaternion()
	};
	parts.LEFT_HIP_ROLL = {
		parent: 'LEFT_HIP_YAW',
		tr: new THREE.Vector3(0, -64, 0),
		rot: new THREE.Quaternion()
	};
	parts.L_THIGH = {
		parent: 'LEFT_HIP_ROLL',
		tr: new THREE.Vector3(),
		rot: new THREE.Quaternion()
	};
	parts.L_LEG = {
		parent: 'L_THIGH',
		tr: new THREE.Vector3(0, -300, 0),
		rot: new THREE.Quaternion()
	};
	parts.LEFT_ANKLE = {
		parent: 'L_LEG',
		tr: new THREE.Vector3(0, -300, 0),
		rot: new THREE.Quaternion()
	};
	parts.LEFT_FOOT = {
		parent: 'LEFT_ANKLE',
		tr: new THREE.Vector3(),
		rot: new THREE.Quaternion()
	};
	// Save the keys
	part_keys = Object.keys(parts);
	// Servo configuration
	servos.push(parts.NECK);
	servos.push(parts.CAM);
	// left arm
	servos.push(parts.LEFT_SHOULDER_PITCH);
	servos.push(parts.LEFT_SHOULDER_ROLL);
	servos.push(parts.LEFT_ARM);
	servos.push(parts.INTER_LEFT_ELBOW);
	servos.push(null); // placeholder
	servos.push(null);
	servos.push(null);
	// left leg
	servos.push(null); // placeholder
	servos.push(null);
	servos.push(null);
	servos.push(null);
	servos.push(null);
	servos.push(null);
	// right leg
	servos.push(null); // placeholder
	servos.push(null);
	servos.push(null);
	servos.push(null);
	servos.push(null);
	servos.push(null);
	// right arm
	servos.push(parts.RIGHT_SHOULDER_PITCH);
	servos.push(parts.RIGHT_SHOULDER_ROLL);
	servos.push(parts.RIGHT_ARM);
	servos.push(parts.INTER_RIGHT_ELBOW);
	servos.push(null); // placeholder
	servos.push(null);
	servos.push(null);

	// Load each chain
	part_keys.forEach(function (part) {
		if (parts[part].mesh === undefined) {
			loader.load('/stl/' + part + '.stl');
		}
	});
}(this));