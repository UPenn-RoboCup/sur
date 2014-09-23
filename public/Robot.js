(function (ctx) {
	'use strict';
	var THREE = ctx.THREE,
		// Scene exported from mesh_scene. TODO: Check this!
		scene = ctx.SCENE || new THREE.Scene(),
		robot = new THREE.Object3D(),
		loader = new THREE.STLLoader(),
		// Match the loaded file URL
		stl_matcher = new RegExp("/stl/(\\S+)\\.stl"),
		robot_material = new THREE.MeshPhongMaterial({
			// Black knight! http://encycolorpedia.com/313637
			ambient: 0xFDEEF4,
			color: 0x313637,
			specular: 0x111111
		}),
		STL_MOTOR_WIDTH = 48,
		parts = {},
		part_keys;

	// Starting position
	robot.translateY(1000);

	function augment_scene() {
		var part, parent, mesh;
		part_keys.forEach(function (p) {
			part = parts[p];
			mesh = part.mesh;
			if (part.tr !== undefined) {
				mesh.applyMatrix(part.tr);
			}
			if (part.parent !== undefined) {
				parent = parts[part.parent];
				parent.mesh.add(mesh);
			} else {
				robot.add(mesh);
			}
		});
		scene.add(robot);
	}

	// root
	parts.TORSO_PITCH_SERVO = {

	};
	parts.PELVIS = {
		id: 29,
		tr: (new THREE.Matrix4()).compose(new THREE.Vector3(0, -128, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1))
	};
	parts.CHEST = {
		id: 30,
		tr: (new THREE.Matrix4()).compose(new THREE.Vector3(0, 170, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1))
	};
	// Head
	parts.NECK = {
		id: 1,
		parent: 'CHEST',
		tr: (new THREE.Matrix4()).compose(new THREE.Vector3(0, 40, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1))
	};
	parts.CAM = {
		id: 2,
		parent: 'NECK',
		tr: (new THREE.Matrix4()).compose(new THREE.Vector3(0, 111, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1))
	};
	// RArm
	parts.RIGHT_SHOULDER_PITCH = {
		id: 3,
		parent: 'CHEST',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(STL_MOTOR_WIDTH - 234, 0, 0),
			(new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), -Math.PI / 2),
			new THREE.Vector3(1, 1, 1)
		)
	};
	parts.RIGHT_SHOULDER_ROLL = {
		id: 4,
		parent: 'RIGHT_SHOULDER_PITCH',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(0, -STL_MOTOR_WIDTH, STL_MOTOR_WIDTH / 2),
			(new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), Math.PI / 2),
			new THREE.Vector3(1, 1, 1)
		)
	};
	parts.RIGHT_ARM = {
		id: 5,
		parent: 'RIGHT_SHOULDER_ROLL',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(0, -STL_MOTOR_WIDTH / 2, -STL_MOTOR_WIDTH / 2),
			(new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), Math.PI),
			new THREE.Vector3(1, 1, 1)
		)
	};
	parts.RIGHT_ELBOW = {
		id: 6,
		parent: 'RIGHT_ARM',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(0, -246 + STL_MOTOR_WIDTH / 2, 0),
			new THREE.Quaternion(),
			new THREE.Vector3(1, 1, 1)
		)
	};
	parts.RIGHT_WRIST = {
		id: 7,
		parent: 'RIGHT_ELBOW',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(0, -250, 0),
			new THREE.Quaternion(),
			new THREE.Vector3(1, 1, 1)
		)
	};
	// LArm
	parts.LEFT_SHOULDER_PITCH = {
		id: 3,
		parent: 'CHEST',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(234 - STL_MOTOR_WIDTH, 0, 0),
			(new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), Math.PI / 2),
			new THREE.Vector3(1, 1, 1)
		)
	};
	parts.LEFT_SHOULDER_ROLL = {
		id: 4,
		parent: 'LEFT_SHOULDER_PITCH',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(0, -STL_MOTOR_WIDTH, STL_MOTOR_WIDTH / 2),
			//new THREE.Quaternion(),
			(new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 0, 1)), -Math.PI / 2),
			new THREE.Vector3(1, 1, 1)
		)
	};
	parts.LEFT_ARM = {
		id: 5,
		parent: 'LEFT_SHOULDER_ROLL',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(0, -STL_MOTOR_WIDTH / 2, -STL_MOTOR_WIDTH / 2),
			new THREE.Quaternion(),
			new THREE.Vector3(1, 1, 1)
		)
	};
	parts.LEFT_ELBOW = {
		id: 6,
		parent: 'LEFT_ARM',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(0, -246 + STL_MOTOR_WIDTH / 2, 0),
			new THREE.Quaternion(),
			new THREE.Vector3(1, 1, 1)
		)
	};
	parts.LEFT_WRIST = {
		id: 7,
		parent: 'LEFT_ELBOW',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(0, -250, 0),
			new THREE.Quaternion(),
			new THREE.Vector3(1, 1, 1)
		)
	};
	// RLeg
	parts.RIGHT_HIP_YAW = {
		id: 7,
		parent: 'PELVIS',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(-72, -16 - 64, 0),
			new THREE.Quaternion(),
			new THREE.Vector3(1, 1, 1)
		)
	};
	parts.RIGHT_HIP_ROLL = {
		id: 7,
		parent: 'RIGHT_HIP_YAW',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(0, -64, 0),
			new THREE.Quaternion(),
			new THREE.Vector3(1, 1, 1)
		)
	};
	parts.R_THIGH = {
		id: 7,
		parent: 'RIGHT_HIP_ROLL',
		tr: (new THREE.Matrix4()).compose(
			new THREE.Vector3(),
			(new THREE.Quaternion()).setFromAxisAngle((new THREE.Vector3(0, 1, 0)), Math.PI),
			new THREE.Vector3(1, 1, 1)
		)
	};
	
	

	part_keys = Object.keys(parts);
	/*
			"CHEST",
			"FOOT",
			"LEFT_ANKLE",
			"LEFT_ARM",
			"LEFT_ELBOW",
			"LEFT_GRIPPER",
			"LEFT_HIP_YAW",
			"LEFT_SHOULDER_PITCH",
			"L_LEG",
			"L_THIGH",
			"NECK",
			"PELVIS",
			"RIGHT_ARM",
			"RIGHT_ELBOW",
			"RIGHT_GRIPPER",
			"RIGHT_HIP_ROLL",
			"RIGHT_KNEE_PITCH",
			"RIGHT_SHOULDER_PITCH",
			"RIGHT_SHOULDER_ROLL",
			"RIGHT_WRIST",
			"R_LEG",
			"R_THIGH",
			"TORSO_PITCH_SERVO"
			*/

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
	// Load each chain
	part_keys.forEach(function (part) {
		loader.load('/stl/' + part + '.stl');
	});
}(this));