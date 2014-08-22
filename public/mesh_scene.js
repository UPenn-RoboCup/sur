(function (ctx) {
	'use strict';
	// Private variables
	var USE_WEBWORKERS = true,
		d3 = ctx.d3,
		THREE = ctx.THREE,
		Transform = ctx.Transform,
		mesh_feed,
		mesh_worker,
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
		var geometry = new THREE.BufferGeometry(),
			material = new THREE.MeshPhongMaterial({
				ambient: 0x555555,
				specular: 0x111111,
				shininess: 200,
				side: THREE.DoubleSide,
				color: 0x00CC00
				//vertexColors: THREE.VertexColors, // if not phong...
			}),
			mesh;
		geometry.attributes = {
			index: {
				itemSize: 1,
				array: mesh_obj.idx
			},
			position: {
				itemSize: 3,
				array: mesh_obj.pos
			},
			color: {
				itemSize: 3,
				array: mesh_obj.col
			}
		};
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
		// Load the robot dynamically
		ctx.util.ljs('/STLLoader.js', function () {
			var loader = new THREE.STLLoader(),
				material = new THREE.MeshPhongMaterial({
					// Black knight! http://encycolorpedia.com/313637
					ambient: 0xFDEEF4,
					color: 0x313637,
					specular: 0x111111,
					shininess: 200
				});
			loader.addEventListener('load', function (event) {
				var geometry = event.content,
					mesh = new THREE.Mesh(geometry, material);
				scene.add(mesh);
			});
			loader.load('/stl/CHEST.stl');
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
			// Just see the canvas:
			//document.body.appendChild(mesh_canvas);
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