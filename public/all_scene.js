(function (ctx) {
	'use strict';
	// Private variables
	var d3 = ctx.d3,
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

  function find_plane(mesh, point) {
    // Find all the points near it assuming upright
    var indices = mesh.geometry.getAttribute('index').array,
      positions = mesh.geometry.getAttribute('position').array,
      offsets = mesh.geometry.drawcalls,
      point2 = point.clone().divideScalar(1000),
    	vA = new THREE.Vector3(),
    	vB = new THREE.Vector3(),
    	vC = new THREE.Vector3(),
      a, b, c,
      nClose = 0,
      xSum = 0,
      zSum = 0,
      ySum = 0,
      xxSum = 0,
      zzSum = 0,
      xzSum = 0,
      xySum = 0,
      zySum = 0;
    // From the raycaster (https://raw.githubusercontent.com/mrdoob/three.js/master/src/objects/Mesh.js)
    for ( var oi = 0, ol = offsets.length; oi < ol; ++oi ) {
			var start = offsets[ oi ].start;
			var count = offsets[ oi ].count;
			var index = offsets[ oi ].index;
			for ( var i = start, il = start + count; i < il; i += 3 ) {
				a = index + indices[ i ];
				//b = index + indices[ i + 1 ];
				//c = index + indices[ i + 2 ];
				vA.fromArray( positions, a * 3 ).divideScalar(1000);
				//vB.fromArray( positions, b * 3 ).sub(point).divideScalar(1000);
				//vC.fromArray( positions, c * 3 ).sub(point).divideScalar(1000);
        // Check distance - ensure the full face
        // TODO: Grab these values from the user somehow
        if (Math.abs(vA.y - point2.y) > 0.01 || Math.abs(point2.x - vA.x) > 0.1 || Math.abs(point2.z - vA.z) > 0.1){
          continue;
        }
        // Compute the running nearest circle
        nClose += 1;
        xSum += vA.x;
        zSum += vA.z;
        //
        xxSum += vA.x * vA.x;
        zzSum += vA.z * vA.z;
        xzSum += vA.x * vA.z;
        //
        xySum += vA.x * vA.y;
        zySum += vA.z * vA.y;
        ySum += vA.y;
			}
		}
    
    // http://stackoverflow.com/questions/1400213/3d-least-squares-plane
    var A_plane = $M([
      [zzSum, xzSum, zSum],
      [xzSum, xxSum, xSum],
      [zSum, xSum, nClose]
    ]);
    var b_plane = $V([zySum, xySum, ySum]);
    var A_plane_inv = A_plane.inv();
    var sol_plane = A_plane_inv.multiply(b_plane);
    var pl_normal = (new THREE.Vector3()).set(sol_plane.e(2), sol_plane.e(3), sol_plane.e(1)).normalize();
    var plane_rot = (new THREE.Quaternion()).setFromUnitVectors(pl_normal, new THREE.Vector3(0, 1, 0));    
    var pl_geometry = new THREE.BoxGeometry(100, 10, 100);
    var pl_material = new THREE.MeshPhongMaterial( {color: 0xaaaaaa, side: THREE.DoubleSide} );
    var plane = new THREE.Mesh( pl_geometry, pl_material );
    plane.position.copy(point);
    plane.quaternion.copy(plane_rot);
    scene.add(plane);
  }


  function find_cylinder(mesh, point) {
    var indices = mesh.geometry.getAttribute('index').array,
      positions = mesh.geometry.getAttribute('position').array,
      offsets = mesh.geometry.drawcalls,
      point2 = point.clone().divideScalar(1000),
    	vA = new THREE.Vector3(),
    	vB = new THREE.Vector3(),
    	vC = new THREE.Vector3(),
      a, b, c,
      nClose = 0,
      xSum = 0,
      xxSum = 0,
      zSum = 0,
      zzSum = 0,
      xzSum = 0,
      xxxSum = 0,
      zzzSum = 0,
      xzzSum = 0,
      xxzSum = 0,
      xySum = 0,
      zySum = 0,
      ySum = 0;
    for ( var oi = 0, ol = offsets.length; oi < ol; ++oi ) {
			var start = offsets[ oi ].start;
			var count = offsets[ oi ].count;
			var index = offsets[ oi ].index;
			for ( var i = start, il = start + count; i < il; i += 3 ) {
				a = index + indices[ i ];
				//b = index + indices[ i + 1 ];
				//c = index + indices[ i + 2 ];
				vA.fromArray( positions, a * 3 ).divideScalar(1000);
				//vB.fromArray( positions, b * 3 ).sub(point).divideScalar(1000);
				//vC.fromArray( positions, c * 3 ).sub(point).divideScalar(1000);
        // Check distance - ensure the full face
        // TODO: Grab these values from the user somehow
        if (Math.abs(vA.y - point2.y) > 0.01 || Math.abs(point2.x - vA.x) > 0.15 || Math.abs(point2.z - vA.z) > 0.15){
          continue;
        }
        // Compute the running nearest circle
        nClose += 1;
        xSum += vA.x;
        zSum += vA.z;
        //
        xxSum += vA.x * vA.x;
        zzSum += vA.z * vA.z;
        xzSum += vA.x * vA.z;
        //
        xxxSum += Math.pow(vA.x, 3);
        zzzSum += Math.pow(vA.z, 3);
        xzzSum += vA.x * vA.z * vA.z;
        xxzSum += vA.x * vA.x * vA.z;
        //
        xySum += vA.x * vA.y;
        zySum += vA.z * vA.y;
        ySum += vA.y;
			}
		}
    // http://www.geometrictools.com/Documentation/CylinderFitting.pdf
    // http://www.physics.oregonstate.edu/paradigms/Publications/ConicSections.html
    // http://www.had2know.com/academics/best-fit-circle-least-squares.html
    var Amat = $M([
      [zzSum, xzSum, zSum],
      [xzSum, xxSum, xSum],
      [zSum, xSum, nClose]
    ]);
    //window.console.log(Amat);
    var bvec = $V([
      xxzSum + zzzSum,
      xzzSum + xxxSum,
      zzSum + xxSum
    ]);
    var Amat_inv = Amat.inv();
    var Ainv_bvec = Amat_inv.multiply(bvec);
    var zc = Ainv_bvec.e(1) / 2,
      xc = Ainv_bvec.e(2) / 2,
      r = Math.sqrt(4 * Ainv_bvec.e(3) + Math.pow(Ainv_bvec.e(1), 2) + Math.pow(Ainv_bvec.e(2), 2)) / 2;
    var geometry = new THREE.CylinderGeometry(r*1000, r*1000, 25.4);
    var material = new THREE.MeshBasicMaterial({color: 0xffff00});
    var cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.set(xc*1000, point.y, zc*1000);
    
    // Add to the scene
    scene.add(cylinder);
    items.push(cylinder);
  }

	// Select an object to rotate around, or general selection for other stuff
	// TODO: Should work for right or left click...?
	function select_object(e) {
		// find the mouse position (use NDC coordinates, per documentation)
		var mouse_vector = new THREE.Vector3((e.offsetX / CANVAS_WIDTH) * 2 - 1, -(e.offsetY / CANVAS_HEIGHT) * 2 + 1).unproject(camera),
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
        //find_plane(mesh0, p0);
        find_cylinder(mesh0, p0);
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
        // See the mesh on both sides
				side: THREE.DoubleSide,
        // Enable all color channels
				color: 0xFFFFFF, //0xaaaaaa,
        // Fill the color channels with the colors attribute through the vertex shader
        vertexColors: THREE.VertexColors,
        // TODO: Check the extra Phong parameters
//        ambient: 0xaaaaaa, specular: 0xffffff, shininess: 250,
			}),
			mesh;
    // Custom attributes required for rendering the BufferGeometry
    // http://threejs.org/docs/#Reference/Core/BufferGeometry
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
    // TODO: Apply the transform in which way? Not valid for plotting the LIDAR mesh, though
    // For now, the best bet to to bake into the vertices
    
    var head_pitch = new THREE.Matrix4().makeRotationX(mesh_obj.q[1]),
      head_yaw = new THREE.Matrix4().makeRotationY(mesh_obj.q[0]);
    //window.console.log(head_pitch_yaw);
    var neckZ = new THREE.Matrix4().makeTranslation(0, 1000 * (0.165 + 0.161), 0);  
//    var rpy = new THREE.Euler().fromArray(mesh_obj.rpy);
//    rpy.order = 'ZXY';
    var bodyCOM = new THREE.Matrix4().makeRotationX(mesh_obj.rpy[1]);
    bodyCOM.setPosition(new THREE.Vector3(0, 1000*mesh_obj.bh, 0));
    geometry.applyMatrix(
      //head_yaw.multiply(head_pitch.multiply(neckZ.multiply(bodyCOM)))
      bodyCOM.multiply(neckZ.multiply(head_yaw.multiply(head_pitch)))
    );
		// Dynamic, because we will do raycasting
		geometry.dynamic = true;
		// for picking via raycasting
		geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
		// Phong Material requires normals for reflectivity
    // TODO: Perform the normals computation in the Worker thread maybe?
		geometry.computeVertexNormals();
    //mesh.applyMatrix((new THREE.Matrix4()).makeTranslation(0,1000,0));
    // Add the mesh to the scene
		scene.add(mesh);
    //window.console.log(mesh);
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
  // Load the Matrix library
	ctx.util.ljs('/js/sylvester-min.js');
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