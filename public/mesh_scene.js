(function (ctx) {
	'use strict';
	// Private variables
	var USE_WEBWORKERS = true,
		d3 = ctx.d3,
		THREE = ctx.THREE,
		Transform = ctx.Transform,
		meshes = [],
		mesh_feed,
		mesh_worker,
		container,
		renderer,
		scene,
		camera,
		controls,
		CANVAS_WIDTH,
		CANVAS_HEIGHT,
		stl_matcher = new RegExp("/stl/(\\S+)\\.stl");
	// Constantly animate the scene
	function animate() {
		if (controls) {
			controls.update();
		}
		renderer.render(scene, camera);
		window.requestAnimationFrame(animate);
	}
	// Adds THREE buffer geometry from triangulated mesh to the scene
	function process_mesh(mesh_obj) {
		var geometry = new THREE.BufferGeometry(),
			material = new THREE.MeshLambertMaterial({
				side: THREE.DoubleSide,
				color: 0x00CC00
			}),
			mesh;
		geometry.addAttribute('position', new THREE.BufferAttribute(mesh_obj.pos, 3));
		geometry.addAttribute('index', new THREE.BufferAttribute(mesh_obj.idx, 1));
		//geometry.addAttribute('color', new THREE.BufferAttribute(mesh_obj.col, 3));
		geometry.offsets = mesh_obj.quad_offsets;
		// Dynamic, because we will do raycasting
		geometry.dynamic = true;
		// for picking via raycasting
		geometry.computeBoundingSphere();
		// Phong Material requires normals for reflectivity
		geometry.computeVertexNormals();
		// Make the new mesh, and return to the user
		mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
		// Accounting
		scene.remove(meshes.shift());
		meshes.push(mesh);
	}

	// Process the frame, which is always the chest lidar
	function process_frame() {
		var canvas = mesh_feed.canvas,
			metadata = canvas.metadata,
			width = canvas.width,
			height = canvas.height,
			npix = width * height,
			pixels = mesh_feed.context2d.getImageData(1, 1, width, height).data,
			mesh_obj = {
				width: width,
				height: height,
				hfov: metadata.sfov,
				vfov: metadata.rfov,
				dynrange: metadata.dr,
				a: metadata.a,
				pixels: pixels,
				// Make the max allocations
				// TODO: Can we reuse these?
				pixdex: new window.Uint32Array(pixels.buffer),
				positions: new window.Float32Array(npix * 3),
				colors: new window.Float32Array(npix * 3),
				index: new window.Uint16Array(npix * 6)
			};
		if (USE_WEBWORKERS) {
			mesh_worker.postMessage(mesh_obj, [mesh_obj.pixels.buffer]);
		} else {
			process_mesh(Transform.make_quads(mesh_obj));
		}
	}
	// Add the camera view and append
	function setup() {
		// Build the scene
		var spotLight,
			ground = new THREE.Mesh(
				new THREE.PlaneGeometry(100000, 100000),
				new THREE.MeshBasicMaterial({
					side: THREE.DoubleSide,
					color: 0x7F5217
				})
			);
		container = document.getElementById('world_container');
		CANVAS_WIDTH = container.clientWidth;
		CANVAS_HEIGHT = container.clientHeight;
		camera = new THREE.PerspectiveCamera(75, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1e6);
		scene = new THREE.Scene();
		renderer = new THREE.WebGLRenderer({
			antialias: false
		});
		renderer.setClearColor(0x80CCFF, 1);
		renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
		container.appendChild(renderer.domElement);
		camera.position.copy(new THREE.Vector3(500, 2000, -500));
		// Load in the Orbit controls dynamically
		ctx.util.ljs('/OrbitControls.js', function () {
			controls = new THREE.OrbitControls(camera, container);
			controls.target = new THREE.Vector3(0, 0, 5000);
		});
		// Load the ground
		ground.rotation.x = -Math.PI / 2;
		scene.add(ground);
		// Add light from robot
		spotLight = new THREE.PointLight(0xffffff, 1, 0);
		spotLight.position.set(0, 1000, 0);
		spotLight.castShadow = true;
		scene.add(spotLight);
		// Animate the buttons
		d3.selectAll('button').on('click', function () {
			// 'this' variable is the button node
		});
		// Handle resizing
		window.addEventListener('resize', function () {
			CANVAS_WIDTH = container.clientWidth;
			CANVAS_HEIGHT = container.clientHeight;
			camera.aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
			camera.updateProjectionMatrix();
			renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
		}, false);
		animate();
		// Load the robot dynamically
		ctx.util.ljs('/STLLoader.js', function () {
			var loader = new THREE.STLLoader(),
				robot_material = new THREE.MeshLambertMaterial({
					// Black knight! http://encycolorpedia.com/313637
					ambient: 0xFDEEF4,
					color: 0x313637,
					specular: 0x111111
				}),
				parts = [
					"CAM",
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
				];
			loader.addEventListener('load', function (event) {
				var geometry = event.content,
					part = event.url.match(stl_matcher)[1],
					mesh;
				if (part !== undefined) {
					mesh = new THREE.Mesh(geometry, robot_material);
					scene.add(mesh);
				}
			});
			parts.forEach(function (part) {
				loader.load('/stl/' + part + '.stl');
			});
		});
	}
	// Load the Styling
	ctx.util.lcss('/css/gh-buttons.css');
	ctx.util.lcss('/css/fb-buttons.css');
	ctx.util.lcss('/css/mesh_scene.css', function () {
		d3.html('/view/mesh_scene.html', function (error, view) {
			// Remove landing page elements and add new content
			d3.select("div#landing").remove();
			// Just see the scene
			document.body.appendChild(view);
			setTimeout(setup, 0);
		});
	});
	// Begin the WebWorker
	if (USE_WEBWORKERS) {
		mesh_worker = new window.Worker("/mesh_worker.js");
		mesh_worker.onmessage = function (e) {
			process_mesh(e.data);
		};
	}
	// Begin listening to the feed
	d3.json('/streams/mesh', function (error, port) {
		mesh_feed = new ctx.VideoFeed(port, process_frame, {
			cw90: true
		});
	});
}(this));
