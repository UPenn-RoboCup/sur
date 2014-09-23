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
		var mesh = s.mesh;
		mesh.matrixWorldNeedsUpdate = true;
		tmp_quat.setFromAxisAngle(s.axel, v).multiply(s.rot);
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
		id: 29,
		tr: new THREE.Vector3(0, -128, 0),
		rot: new THREE.Quaternion()
	};
	parts.CHEST = {
		id: 30,
		tr: new THREE.Vector3(0, 170, 0),
		rot: new THREE.Quaternion()
	};
	// Head
	parts.NECK = {
		id: 1,
		parent: 'CHEST',
		tr: new THREE.Vector3(0, 40, 0),
		rot: new THREE.Quaternion(),
		axel: new THREE.Vector3(0, 1, 0)
	};
	parts.CAM = {
		id: 2,
		parent: 'NECK',
		tr: new THREE.Vector3(0, 111, 0),
		rot: new THREE.Quaternion(),
		axel: new THREE.Vector3(1, 0, 0)
	};
	// RArm
	parts.RIGHT_SHOULDER_PITCH = {
		id: 3,
		parent: 'CHEST',
		tr: new THREE.Vector3(STL_MOTOR_WIDTH - 234, 0, 0),
		rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), -Math.PI / 2)
	};
	parts.RIGHT_SHOULDER_ROLL = {
		id: 4,
		parent: 'RIGHT_SHOULDER_PITCH',
		tr: new THREE.Vector3(0, -STL_MOTOR_WIDTH, STL_MOTOR_WIDTH / 2),
		rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), Math.PI / 2)
	};
	parts.RIGHT_ARM = {
		id: 5,
		parent: 'RIGHT_SHOULDER_ROLL',
		tr: new THREE.Vector3(0, -STL_MOTOR_WIDTH / 2, -STL_MOTOR_WIDTH / 2),
		rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), Math.PI)
	};
	parts.RIGHT_ELBOW = {
		id: 6,
		parent: 'RIGHT_ARM',
		tr: new THREE.Vector3(0, -246 + STL_MOTOR_WIDTH / 2, 0),
		rot: new THREE.Quaternion()
	};
	parts.RIGHT_WRIST = {
		id: 7,
		parent: 'RIGHT_ELBOW',
		tr: new THREE.Vector3(0, -250, 0),
		rot: new THREE.Quaternion()
	};
	// LArm
	parts.LEFT_SHOULDER_PITCH = {
		id: 3,
		parent: 'CHEST',
		tr: new THREE.Vector3(234 - STL_MOTOR_WIDTH, 0, 0),
		rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), Math.PI / 2)
	};
	parts.LEFT_SHOULDER_ROLL = {
		id: 4,
		parent: 'LEFT_SHOULDER_PITCH',
		tr: new THREE.Vector3(0, -STL_MOTOR_WIDTH, STL_MOTOR_WIDTH / 2),
		rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), -Math.PI / 2)
	};
	parts.LEFT_ARM = {
		id: 5,
		parent: 'LEFT_SHOULDER_ROLL',
		tr: new THREE.Vector3(0, -STL_MOTOR_WIDTH / 2, -STL_MOTOR_WIDTH / 2),
		rot: new THREE.Quaternion()
	};
	parts.LEFT_ELBOW = {
		id: 6,
		parent: 'LEFT_ARM',
		tr: new THREE.Vector3(0, -246 + STL_MOTOR_WIDTH / 2, 0),
		rot: new THREE.Quaternion()
	};
	parts.LEFT_WRIST = {
		id: 7,
		parent: 'LEFT_ELBOW',
		tr: new THREE.Vector3(0, -250, 0),
		rot: new THREE.Quaternion()
	};
	// RLeg
	parts.RIGHT_HIP_YAW = {
		id: 7,
		parent: 'PELVIS',
		tr: new THREE.Vector3(-72, -16 - 64, 0),
		rot: new THREE.Quaternion()
	};
	parts.RIGHT_HIP_ROLL = {
		id: 7,
		parent: 'RIGHT_HIP_YAW',
		tr: new THREE.Vector3(0, -64, 0),
		rot: new THREE.Quaternion()
	};
	parts.R_THIGH = {
		id: 7,
		parent: 'RIGHT_HIP_ROLL',
		tr: new THREE.Vector3(),
		rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), Math.PI)
	};
	parts.R_LEG = {
		id: 7,
		parent: 'R_THIGH',
		tr: new THREE.Vector3(0, -300, 0),
		rot: new THREE.Quaternion()
	};
	parts.RIGHT_ANKLE = {
		id: 7,
		parent: 'R_LEG',
		tr: new THREE.Vector3(0, -300, 0),
		rot: (new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), Math.PI)
	};
	parts.RIGHT_FOOT = {
		id: 7,
		parent: 'RIGHT_ANKLE',
		tr: new THREE.Vector3(),
		rot: new THREE.Quaternion()
	};
	// LLeg
	parts.LEFT_HIP_YAW = {
		id: 7,
		parent: 'PELVIS',
		tr: new THREE.Vector3(72, -16 - 64, 0),
		rot: new THREE.Quaternion()
	};
	parts.LEFT_HIP_ROLL = {
		id: 7,
		parent: 'LEFT_HIP_YAW',
		tr: new THREE.Vector3(0, -64, 0),
		rot: new THREE.Quaternion()
	};
	parts.L_THIGH = {
		id: 7,
		parent: 'LEFT_HIP_ROLL',
		tr: new THREE.Vector3(),
		rot: new THREE.Quaternion()
	};
	parts.L_LEG = {
		id: 7,
		parent: 'L_THIGH',
		tr: new THREE.Vector3(0, -300, 0),
		rot: new THREE.Quaternion()
	};
	parts.LEFT_ANKLE = {
		id: 7,
		parent: 'L_LEG',
		tr: new THREE.Vector3(0, -300, 0),
		rot: new THREE.Quaternion()
	};
	parts.LEFT_FOOT = {
		id: 7,
		parent: 'LEFT_ANKLE',
		tr: new THREE.Vector3(),
		rot: new THREE.Quaternion()
	};
	// Save the keys
	part_keys = Object.keys(parts);
	// Servo configuration
	servos.push(parts.NECK);
	servos.push(parts.CAM);
	// Load each chain
	part_keys.forEach(function (part) {
		loader.load('/stl/' + part + '.stl');
	});
}(this));