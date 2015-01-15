(function (ctx) {
	'use strict';
	// Private variables
	var d3 = ctx.d3,
    E,// = ctx.Estimate,
		THREE = ctx.THREE,
		scene = new THREE.Scene(),
    raycaster = new THREE.Raycaster(),
		meshes = [],
		items = [],
    depth_is_processing = false,
    depth_worker,
    rgbd_depth_metadata,
		mesh_feed,
		container,
		renderer,
		camera,
		controls,
		robot,
		robot_preview,
		CANVAS_WIDTH,
    CANVAS_HEIGHT;

	// Select an object to rotate around, or general selection for other stuff
	// TODO: Should work for right or left click...?
	function select_object(e) {
		// find the mouse position (use NDC coordinates, per documentation)
		var mouse_vector = new THREE.Vector3((e.offsetX / CANVAS_WIDTH) * 2 - 1, 1 - (e.offsetY / CANVAS_HEIGHT) * 2).unproject(camera),
			T_point = new THREE.Matrix4(),
			T_inv = new THREE.Matrix4(),
			T_offset = new THREE.Matrix4(),
			intersections,
			obj0,
			p0,
      mesh0;
    // Form the raycaster for the camera's current position
    raycaster.ray.set(camera.position, mouse_vector.sub( camera.position ).normalize());
    // Find the intersections with the various meshes in the scene
    intersections = raycaster.intersectObjects(items.concat(meshes).concat(robot.meshes));
		// Return if no intersections
		if (intersections.length === 0) {
			return;
		}
		// Grab the first intersection object and the intersection point
		obj0 = intersections[0];
		p0 = obj0.point;
    mesh0 = obj0.object;
    // Solve for the transform from the robot frame to the point
		/*
    T_? * T_Robot = T_point
    T_? = T_point * T_Robot ^ -1
    */
		T_point.makeTranslation(p0.x, p0.y, p0.z);
		T_inv.getInverse(robot.object.matrix);
		T_offset.multiplyMatrices(
			T_point,
			T_inv
		);
		//window.console.log(e, obj0, T_point, T_offset);
    window.console.log(
      obj0.object.name,
      'Torso Offset:',
      new THREE.Vector3().setFromMatrixPosition(T_offset).divideScalar(1000).toArray()
    );
    // TODO: Right click behavior
		if (e.button === 2) {
			// Right click
			return;
		} else {
			// Left click: Update the orbit target
			// TODO: make smooth transition via a setInterval interpolation to the target
      if (controls.enabled) {
        controls.target = p0;
      } else {
        // Default gives a text cursor
        e.preventDefault();
        if(mesh0.name !== 'kinectV2'){
          return;
        }
        
        /*
        // Plane estimation
        var parameters = E.plane(mesh0, p0);
        var geometry = new THREE.PlaneBufferGeometry( 200, 200, 200 );
        var material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
        var plane = new THREE.Mesh(geometry, material);
        plane.position.fromArray(parameters.root);
        plane.quaternion.multiply((new THREE.Quaternion()).setFromUnitVectors(new THREE.Vector3(0,0,1), (new THREE.Vector3()).fromArray(parameters.normal)));
        scene.add(plane);
        items.push(plane);
        */
        
        // Cylinder
        var parameters = E.cylinder(mesh0, p0);
        var geometry = new THREE.CylinderGeometry(parameters.r, parameters.r, parameters.h, 20);
        var material = new THREE.MeshBasicMaterial({color: 0xffff00});
        var cylinder = new THREE.Mesh(geometry, material);
        cylinder.position.set(parameters.xc, parameters.yc, parameters.zc);
        scene.add(cylinder);
        items.push(cylinder);
        // TODO: add uncertainty
        // [x center, y center, z center, radius, height]
        d3.json('/shm/hcm/assist/cylinder').post(JSON.stringify([
          parameters.zc / 1000,
          parameters.xc / 1000,
          parameters.yc / 1000,
          parameters.r / 1000,
          parameters.h / 1000,
        ]));
      }
		}
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
	function process_mesh(e) {
		var mesh_obj = e.data,
      geometry = new THREE.BufferGeometry(),
			material = new THREE.MeshPhongMaterial({
				side: THREE.DoubleSide,
        // Enable all color channels. Super important for vertex colors!
				color: 0xFFFFFF,
        // Fill the color channels with the colors attribute through the vertex shader
        vertexColors: THREE.VertexColors,
        // TODO: Check the extra Phong parameters
        // ambient: 0xaaaaaa, specular: 0xffffff, shininess: 250,
			}),
			mesh;
    // Custom attributes required for rendering the BufferGeometry
    geometry.addAttribute('index', new THREE.BufferAttribute(mesh_obj.idx, 1));
		geometry.addAttribute('position', new THREE.BufferAttribute(mesh_obj.pos, 3));
		geometry.addAttribute('color', new THREE.BufferAttribute(mesh_obj.col, 3));
    for(var i = 0; i<mesh_obj.drawCalls.length; i++){
      geometry.addDrawCall(
        mesh_obj.drawCalls[i].start, mesh_obj.drawCalls[i].count, mesh_obj.drawCalls[i].index
      );
    }
		// Make the new mesh and remove the previous one
		mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'kinectV2';
		scene.remove(meshes.shift());
		meshes.push(mesh);
		// Dynamic, because we will do raycasting
		geometry.dynamic = true;
		// for picking via raycasting
		geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
		// Phong Material requires normals for reflectivity
    // TODO: Perform the normals computation in the Worker thread maybe?
		geometry.computeVertexNormals();
    // Add the mesh to the scene
		scene.add(mesh);
    // Finished drawing on the screen
    depth_is_processing = false;
	}

	// Process the frame, which is always the chest lidar
	function process_mesh_frame() {
    if (depth_is_processing) {
      return;
    }
		var canvas = mesh_feed.canvas,
			metadata = canvas.metadata,
			width = canvas.width,
			height = canvas.height,
			npix = width * height,
			pixels = mesh_feed.context2d.getImageData(1, 1, width, height).data,
			mesh_obj = {
        id: 'mesh',
				width: width,
				height: height,
				hfov: metadata.sfov,
				vfov: metadata.rfov,
				dynrange: metadata.dr,
				a: metadata.a,
				pitch: metadata.pitch,
				roll: metadata.roll,
				// Make the max allocations
				// TODO: Can we reuse these?
        index: new window.Uint16Array(npix * 6),
				positions: new window.Float32Array(npix * 3),
				colors: new window.Float32Array(npix * 3),
        pixels: pixels,
        pixdex: new window.Uint32Array(pixels.buffer),
			};
    depth_worker.postMessage(mesh_obj, [
      mesh_obj.index.buffer,
      mesh_obj.positions.buffer,
      mesh_obj.colors.buffer,
      mesh_obj.pixels.buffer,
    ]);
    // Don't post to the depth worker until done
    depth_is_processing = true;
	}
  
	function process_kinectV2_frame(e) {
		if (typeof e.data === 'string') {
			rgbd_depth_metadata = JSON.parse(e.data);
			if (rgbd_depth_metadata.t !== undefined) {
				// Add latency measure if possible
				rgbd_depth_metadata.latency = (e.timeStamp / 1e3) - rgbd_depth_metadata.t;
			}
		} else if (!depth_is_processing) {
      // Allocations
      // TODO: Maintain a fixed set of allocations to avoid penalty on each new data
      var npix = rgbd_depth_metadata.height * rgbd_depth_metadata.width;
      rgbd_depth_metadata.index = new window.Uint16Array(npix * 6);
			rgbd_depth_metadata.positions = new window.Float32Array(npix * 3);
      rgbd_depth_metadata.colors = new window.Float32Array(npix * 3);
			rgbd_depth_metadata.pixels = new window.Float32Array(e.data);
      rgbd_depth_metadata.pixdex = new window.Uint32Array(rgbd_depth_metadata.pixels.buffer);
			depth_worker.postMessage(rgbd_depth_metadata,[
        rgbd_depth_metadata.index.buffer,
        rgbd_depth_metadata.positions.buffer,
        rgbd_depth_metadata.colors.buffer,
        rgbd_depth_metadata.pixels.buffer
      ]);
      // Don't post to the depth worker until done
      depth_is_processing = true;
		}
	}
	// Add the camera view and append
	function setup() {
		// Build the scene
		var spotLight,
			ground = new THREE.Mesh(
				new THREE.PlaneBufferGeometry(100000, 100000),
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
		container.addEventListener('mousedown', select_object, false);
		camera = new THREE.PerspectiveCamera(75, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 1e6);
    //camera = new THREE.OrthographicCamera( CANVAS_WIDTH / - 2, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT / - 2, 1, 1000 );
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
		// Handle resizing
		window.addEventListener('resize', function () {
			CANVAS_WIDTH = container.clientWidth;
			CANVAS_HEIGHT = container.clientHeight;
			camera.aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
			camera.updateProjectionMatrix();
			renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
		}, false);
		animate();
		// Begin listening to the feed
		d3.json('/streams/feedback', function (error, port) {
			// Load the robot
			robot = new ctx.Robot({
				scene: scene,
				port: port
			});
			/*
			robot_preview = new ctx.Robot({
				scene: scene,
				port: port,
				material: new THREE.MeshPhongMaterial({
					// Black knight! http://encycolorpedia.com/313637
					ambient: 0x87EE81,
					color: 0x313637,
					specular: 0x111111,
					transparent: true,
					opacity: 0.5
				})
			});
			*/
		});
    // User interactions
		d3.select('select#operations').on('change', function () {
			// 'this' variable is the button node
      switch(this.value){
      case 'home':
        break;
      case 'look':
        controls.enabled = true;
        break;
      case 'draw':
        controls.enabled = false;
        break;
      default:
        break;
      }
		});
	}
  
  ctx.util.ljs('/Estimate.js', function(){
    E = ctx.Estimate;
  });
  
	// Load the Styling
	ctx.util.lcss('/css/gh-buttons.css');
	ctx.util.lcss('/css/all_scene.css', function () {
		d3.html('/view/all_scene.html', function (error, view) {
			// Remove landing page elements and add new content
			d3.select("div#landing").remove();
			// Just see the scene
			document.body.appendChild(view);
			setTimeout(setup, 0);
		});
	});
	// Begin listening to the feed
	d3.json('/streams/mesh', function (error, port) {
		mesh_feed = new ctx.VideoFeed({
			port: port,
			fr_callback: process_mesh_frame,
			cw90: true
		});
	});
	// Add the depth rgb_feed
	d3.json('/streams/kinect2_depth', function (error, port) {
		var depth_ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port);
		depth_ws.binaryType = 'arraybuffer';
		depth_ws.onmessage = process_kinectV2_frame;
	});
	// Depth Worker for both mesh and kinect
	depth_worker = new window.Worker("/allmesh_worker.js");
	depth_worker.onmessage = process_mesh;
}(this));