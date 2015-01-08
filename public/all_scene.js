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
		CANVAS_HEIGHT,
    pow = Math.pow,
    abs = Math.abs,
    sqrt = Math.sqrt;
  
  function* array_generator(arr){
    var i, l;
    for(i = 0, l = arr.length; i<l; i+=1){
      yield arr[i];
    }
  }
  
  function* mesh_generator(mesh){
    var indices = mesh.geometry.getAttribute('index').array,
      positions = mesh.geometry.getAttribute('position').array,
      offsets = mesh.geometry.drawcalls,
      p;
    for ( var oi = 0, ol = offsets.length; oi < ol; ++oi ) {
			var start = offsets[ oi ].start;
			var count = offsets[ oi ].count;
			var index = offsets[ oi ].index;
			for ( var i = start, il = start + count; i < il; i += 3 ) {
        p = index + indices[ i ];
			  yield positions.subarray(3 * p, 3 * p + 3);
			}
    }
  }

  function estimate_plane(it, base, mask_func) {
    // Find all the points near it assuming upright
    var vA = new THREE.Vector3(),
      nClose = 0,
      xSum = 0,
      zSum = 0,
      ySum = 0,
      xxSum = 0,
      zzSum = 0,
      xzSum = 0,
      xySum = 0,
      zySum = 0;
    for (var p of it){
      vA.fromArray(p);
      if (mask_func===undefined || mask_func(vA)) {
        // Avoid overflow
        vA.sub(base);//.divideScalar(1000);
        // Compute the running nearest circle
        nClose += 1;
        xSum += vA.x;
        zSum += vA.z;
        ySum += vA.y;
        //
        xxSum += pow(vA.x, 2);
        zzSum += pow(vA.z, 2);
        //
        xzSum += vA.x * vA.z;
        xySum += vA.x * vA.y;
        zySum += vA.z * vA.y;
      }
    }
    // http://stackoverflow.com/questions/1400213/3d-least-squares-plane
    var A_plane = $M([
      [zzSum, xzSum, zSum],
      [xzSum, xxSum, xSum],
      [zSum, xSum, nClose]
    ]);
    //window.console.log(A_plane.inspect());
    var b_plane = $V([zySum, xySum, ySum]);
    //window.console.log(b_plane.inspect());
    var A_plane_inv = A_plane.inv();
    var sol_plane = A_plane_inv.multiply(b_plane);
    var a = sol_plane.e(1),
      b = sol_plane.e(2);
    //window.console.log('abcd',a,b,c,d);
    var normal = $V([-a, -b, 1]).toUnitVector();
    window.console.log(sol_plane);
    return {
      normal: [normal.e(2), normal.e(3), normal.e(1)],
    }
    
  }

  function estimate_cylinder(it, mask_func) {
    var vA = new THREE.Vector3(),
      nClose = 0,
      xSum = 0,
      xxSum = 0,
      zSum = 0,
      zzSum = 0,
      xzSum = 0,
      xxxSum = 0,
      zzzSum = 0,
      xzzSum = 0,
      xxzSum = 0;
    for (var p of it){
      vA.fromArray(p);
      if (mask_func===undefined || mask_func(vA)) {
        // Avoid overflow
        vA.divideScalar(1000);
        // Compute the running nearest circle
        nClose += 1;
        xSum += vA.x;
        zSum += vA.z;
        xxSum += pow(vA.x, 2);
        zzSum += pow(vA.z, 2);
        xzSum += vA.x * vA.z;
        xzzSum += vA.x * pow(vA.z, 2);
        xxzSum += pow(vA.x, 2) * vA.z;
        xxxSum += pow(vA.x, 3);
        zzzSum += pow(vA.z, 3);
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
    //window.console.log(Amat.inspect());
    var bvec = $V([
      xxzSum + zzzSum,
      xzzSum + xxxSum,
      zzSum + xxSum
    ]);
    var Amat_inv = Amat.inv();
    var Ainv_bvec = Amat_inv.multiply(bvec);
    var zc = Ainv_bvec.e(1) / 2 * 1000,
      xc = Ainv_bvec.e(2) / 2 * 1000,
      r = sqrt(4 * Ainv_bvec.e(3) + pow(Ainv_bvec.e(1), 2) + pow(Ainv_bvec.e(2), 2)) / 2 * 1000;
    return {
      r: r,
      xc: xc,
      zc: zc,
    };
  }

  // Grow a cylinder from a parameter set
  // (x - h)^2 + (y - k)^2 = r^2
  function grow_cylinder(mesh, params) {
    var vA = new THREE.Vector3(),
      sublevels = [],
      err_r,
      iter;
    
    // Find the valid sublevels based on how well the radius agrees
    // TODO: Use some probablity thing, maybe
    iter = new mesh_generator(mesh);
    for (var p of iter){
      vA.fromArray(p);
      err_r = sqrt(pow(vA.x - params.xc, 2) +  pow(vA.z - params.zc, 2)) - params.r;
      if (err_r < 7) { sublevels.push(vA.toArray()); }
    }
    
    // Get the connected region that includes the clicked point
    var goodlevels = sublevels.sort(function(first, second){
      if (first[1] === second[1]){return 0;} else if (first[1] < second[1]){return -1;} else{return 1;}
    });
    var y0_is_seen = false,
      i_lower = 0, i_upper = goodlevels.length,
      p_lower = goodlevels[i_lower], p_upper = goodlevels[i_upper - 1],
      p, p_last;
    // TODO: Get statistics, now, so we know some noise ideas?
    for(var si = 1, sl = goodlevels.length; si < sl; si += 1) {
      p = goodlevels[si];
      p_last = goodlevels[si - 1];
      if (abs(p[1] - params.yc) < 10) { y0_is_seen = true; }
      // 1cm discepancy is a break
      if (p[1] - p_last[1] > 5) {
        if(y0_is_seen){
          i_upper = si;
          p_upper = p_last;
        } else {
          i_lower = si;
          p_lower = p;
        }
      }
    }
    
    // Filter to only the points we want
    var valid_cyl_points = goodlevels.filter(function(value, index, arr){
      return index>=i_lower && index<i_upper;
    });
    
    // Update the parameters from these points
    iter = new array_generator(valid_cyl_points);
    params = estimate_cylinder(iter);
    
    // Add to the scene
    var geometry = new THREE.CylinderGeometry(params.r, params.r, (p_upper[1] - p_lower[1]), 20);
    var material = new THREE.MeshBasicMaterial({color: 0xffff00});
    var cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.set(params.xc, (p_upper[1] + p_lower[1]) / 2, params.zc);
    scene.add(cylinder);
    items.push(cylinder);
  }

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
        
        // Plane
        /*
        var it = new mesh_generator(mesh0);
        var pl_parameters = estimate_plane(it, p0, function(vertex) {
          // TODO: Tune these values
          return abs(vertex.y - p0.y) < 5 || abs(vertex.x - p0.x) < 8 || abs(vertex.z - p0.z) < 8
        });
        window.console.log(pl_parameters);
        var pl_normal = (new THREE.Vector3().fromArray(pl_parameters.normal)).multiplyScalar(100);
        var pl_material = new THREE.MeshPhongMaterial( {color: 0xaaaaaa, side: THREE.DoubleSide} );
        var plane = new THREE.Mesh( new THREE.BoxGeometry(50, 50, 50), pl_material );
        plane.position.copy(p0);
        scene.add(plane);
        plane = new THREE.Mesh( new THREE.BoxGeometry(50, 50, 50), pl_material );
        plane.position.copy(p0).add(pl_normal);
        scene.add(plane);
        */
        
        // Cylinder
        var it = new mesh_generator(mesh0);
        var parameters = estimate_cylinder(it, function(vertex) {
          // TODO: Tune these values
          return abs(vertex.y - p0.y) < 5 && abs(vertex.x - p0.x) < 150 && abs(vertex.z - p0.z) < 150;
        });
        parameters.yc = p0.y;
        grow_cylinder(mesh0, parameters);
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
    if(mesh_obj.q===undefined){
      mesh_obj.q = [0,0,0];
      mesh_obj.bh = 1;
      mesh_obj.rpy = [0,0,0];
    }
    var head_pitch = new THREE.Matrix4().makeRotationX(mesh_obj.q[1]),
      head_yaw = new THREE.Matrix4().makeRotationY(mesh_obj.q[0]),
      neckZ = new THREE.Matrix4().makeTranslation(0, 1000 * (0.165 + 0.161), 0),
      bodyCOM = new THREE.Matrix4().makeRotationX(mesh_obj.rpy[1]);
    bodyCOM.setPosition(new THREE.Vector3(0, 1000*mesh_obj.bh, 0));
    head_pitch.multiply(new THREE.Matrix4().makeTranslation(0,0.049,0));
    geometry.applyMatrix(
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