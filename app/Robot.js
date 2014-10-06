(function (ctx) {
	'use strict';

	var THREE = ctx.THREE;

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

	function update(object, feedback) {
		var i,
			tmp_quat = new THREE.Quaternion(),
			joints = feedback.joints,
			rpy = feedback.rpy,
			pose = feedback.pose,
			servos = object.servos;
		for (i = 0; i < servos.length; i += 1) {
			rotateServo(servos[i], joints[i]);
		}
		tmp_quat.setFromEuler(new THREE.Euler(rpy[1], feedback.pose[2], rpy[0], 'ZXY'));
		object.setRotationFromQuaternion(tmp_quat);
		object.position.y = feedback.height * 1e3;
		object.position.z = pose[0] * 1e3;
		object.position.x = pose[1] * 1e3;
	}

	function Robot(options) {
		options = options || {};

		var THREE = ctx.THREE, // TODO: Best check for THREE.js? Allow 2D option?
			// The 3D THREE.js scene for the robot
			scene = options.scene || new THREE.Scene(),
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
			var feedback = JSON.parse(e.data);
			update(object, feedback.joints, feedback.rpy);
		};
		// END FUNCTIONS

		// TODO: The following should be laoded from JSON
		// Starting position
		object.position.y = 1000;
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
			axel: new THREE.Vector3(0, 1, 0)
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
		servos.push(null); // placeholder
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
		servos.push(null); // placeholder
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
	}

	ctx.Robot = Robot;

}(this));
