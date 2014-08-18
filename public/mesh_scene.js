(function (ctx) {
	'use strict';
	// Private variables
	var d3 = ctx.d3,
		THREE = ctx.THREE,
		Transform = ctx.Transform,
		mesh_feed,
		mesh_worker,
		USE_WEBWORKERS = false,
		container,
		renderer,
		scene,
		camera,
		controls,
		CANVAS_WIDTH,
		CANVAS_HEIGHT;
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
		//console.log('processing mesh', mesh_obj)
		var position = new window.Float32Array(mesh_obj.pos, 0, 3 * mesh_obj.n_el),
			color = new window.Float32Array(mesh_obj.col, 0, 3 * mesh_obj.n_el),
			index = new window.Uint16Array(mesh_obj.idx, 0, 6 * mesh_obj.n_quad),
			offsets = mesh_obj.quad_offsets,
			geometry = new THREE.BufferGeometry(),
			material = new THREE.MeshPhongMaterial({
				ambient: 0x555555,
				specular: 0x111111,
				shininess: 200,
				side: THREE.DoubleSide,
				color: 0x00CC00
				//vertexColors: THREE.VertexColors, // if not phong...
			}),
			mesh;
		//console.log(mesh_obj, geometry);
		// Dynamic, because we will do raycasting
		geometry.dynamic = true;
		geometry.offsets = offsets;
		geometry.attributes = {
			index: {
				itemSize: 1,
				array: index
			},
			position: {
				itemSize: 3,
				array: position
			},
			color: {
				itemSize: 3,
				array: color
			}
		};
		// for picking via raycasting
		geometry.computeBoundingSphere();
		// Phong Material requires normals for reflectivity
		geometry.computeVertexNormals();
		// Make the new mesh, and return to the user
		mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
	}

	// Process the frame, which is always the chest lidar
	function process_frame() {
		var canvas = mesh_feed.canvas,
			metadata = canvas.metadata,
			w = canvas.width,
			h = canvas.height,
			buf,
			mesh_obj;
		// Form the mesh
		buf = mesh_feed.context2d.getImageData(1, 1, w, h).data.buffer;
		mesh_obj = {
			buf: buf,
			width: w,
			height: h,
			hfov: metadata.sfov,
			vfov: metadata.rfov,
			dynrange: metadata.dr
		};
		//console.log(mesh_obj);
		if (USE_WEBWORKERS) {
			mesh_worker.postMessage(mesh_obj, [buf]);
		} else {
			process_mesh(Transform.make_quads(mesh_obj));
		}
	}
	// Add the camera view and append
	function setup() {
		// Build the scene
		var dirLight = (new THREE.DirectionalLight(0xffffff)),
			ground = new THREE.Mesh(new THREE.PlaneGeometry(100000, 100000), new THREE.MeshLambertMaterial({
				ambient: 0x555555,
				specular: 0x111111,
				shininess: 200,
				side: THREE.DoubleSide,
				color: 0x7F5217
			}));
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
		// add light to the scene, from the robot's point of view
		dirLight.position.set(0, 1000, 0).normalize();
		scene.add(dirLight);
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
			// Just see the canvas:
			//document.body.appendChild(mesh_canvas);
		});
	});
	// Begin the WebWorker
	if (USE_WEBWORKERS) {
		mesh_worker = new window.Worker("/controllers/mesh_worker.js");
		mesh_worker.onmessage = function (e) {
			process_mesh(e.data);
		};
	}
	// Begin listening to the feed
	d3.json('/streams/mesh', function (error, port) {
		mesh_feed = new ctx.VideoFeed(port, process_frame, {cw90: true});
	});
}(this));