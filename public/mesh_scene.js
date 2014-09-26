(function (ctx) {
	'use strict';
	// Private variables
	var USE_WEBWORKERS = true,
		Transform = ctx.Transform,
		d3 = ctx.d3,
		THREE = ctx.THREE,
		scene = new THREE.Scene(),
		meshes = [],
    items = [],
		mesh_feed,
		mesh_worker,
		container,
		renderer,
		camera,
		controls,
    robot,
		CANVAS_WIDTH,
		CANVAS_HEIGHT;
  
  // Select an object to rotate around, or general selection for other stuff
  // TODO: Should work for right or left click...?  
  function select_object(e){   
    // find the mouse position (use NDC coordinates, per documentation)
    var mouse_vector = new THREE.Vector3(
      ( e.offsetX / CANVAS_WIDTH ) * 2 - 1,
      -( e.offsetY / CANVAS_HEIGHT ) * 2 + 1),
      projector = new THREE.Projector(),
      raycaster = projector.pickingRay(mouse_vector, camera),
      intersections = raycaster.intersectObjects(items.concat(meshes).concat(robot.meshes));
    //console.log('Mouse',mouse_vector); // need Vector3, not vector2
    //console.log('projector',projector)
    //console.log('picking raycaster',raycaster)
    // intersect the plane
    // if no intersection
    //console.log(intersection)
    if(intersections.length==0){ return; }
    // only give the first intersection point
    var obj0 = intersections[0],
      p0 = obj0.point;
//      r = Transform.three_to_torso(p, Robot); // get the robot point
  
    // debugging
    window.console.log(e, 'Intersection:', obj0, p0);
    
    /*
    T_? * T_Robot = T_point
    T_? = T_point * T_Robot ^ -1
    */
    var T_point = new THREE.Matrix4();
    var T_inv = new THREE.Matrix4()
    var T_offset = new THREE.Matrix4();
    T_point.makeTranslation(p0.x, p0.y, p0.z);
    T_inv.getInverse(robot.object.matrix)
    T_offset.multiplyMatrices(
      T_point,
      T_inv
    );
    
    var offset = window.console.log('Relative:', T_point, T_offset);
    // Update the orbit target
    controls.target = p0;
    //window.console.log('Intersections:', intersections);
  }
    
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
				pitch: metadata.pitch,
				roll: metadata.roll,
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
		renderer = new THREE.WebGLRenderer({
			antialias: false
		});
		renderer.setClearColor(0x80CCFF, 1);
		renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
		container.appendChild(renderer.domElement);
    // Object selection
    container.addEventListener( 'mousedown', select_object, false );
    camera = new THREE.PerspectiveCamera(75, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1e6);
		camera.position.copy(new THREE.Vector3(500, 2000, -500));
		// Load in the Orbit controls dynamically
		ctx.util.ljs('/OrbitControls.js', function () {
			controls = new THREE.OrbitControls(camera, container);
			controls.target = new THREE.Vector3(0, 0, 5000);
		});
		// Load the ground
		ground.rotation.x = -Math.PI / 2;
    ground.name = 'GROUND';
		scene.add(ground);
    items.push(ground);
		// Add light from robot
		spotLight = new THREE.PointLight(0xffffff, 1, 0);
		spotLight.position.set(0, 2000, -100);
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
		// Load the robot
    robot = new ctx.Robot({
      scene: scene
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
		mesh_feed = new ctx.VideoFeed({
      port: port,
      fr_callback: process_frame,
			cw90: true
		});
	});
  
	
}(this));
