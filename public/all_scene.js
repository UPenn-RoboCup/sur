(function (ctx) {
	'use strict';
	// Private variables
	var d3 = ctx.d3,
		debug = ctx.util.debug,
    E,
		THREE,
		scene,
    raycaster,
		meshes = [],
		N_MESH = 1,
		items = [],
    is_processing = false,
    depth_worker,
    rgbd_metadata = {},
		mesh_feed,
    rgb_ctx,
    rgb_canvas,
    rgb_feed,
		container,
		renderer,
		camera,
		controls,
    selection,
		robot,
		robot_preview,
		CANVAS_WIDTH,
    CANVAS_HEIGHT,
    cur_rgb,
    cur_depth,
    peer,
    p_conn,
    peer_id = 'all_scene',
    peer_map_id = 'all_map',
    map_peers = [],
		last_intersection = {t:0};

	var pow = Math.pow, sqrt = Math.sqrt;

	function mat_times_vec(m, v){
		'use strict';
		return m.map(function(r){
			return r[0]*this[0] + r[1]*this[1] + r[2]*this[2] + r[3];
		}, v);
	}

	function get_THREE_mat4(tm){
		return [
			tm.elements.subarray(0,4),
			tm.elements.subarray(4,8),
			tm.elements.subarray(8,12),
			tm.elements.subarray(12,16),
		].map(function(v){
			return [v[0],v[1],v[2],v[3]];
		});
	}

		/*
		// [x center, y center, z center, radius, height]
		d3.json('/shm/hcm/assist/cylinder').post(JSON.stringify([
			parameters.zc / 1000,
			parameters.xc / 1000,
			parameters.yc / 1000,
			parameters.r / 1000,
			parameters.h / 1000,
		]));
		*/

  function minDotI(maxI, curDot, i, arr){
    return (curDot > arr[maxI]) ? i : maxI;
  }
	function angle_idx_inv(idx, nChunks){
		return Math.PI*(2*idx/nChunks-1);
	}

  var describe = {
    cylinder: function(mesh0, p0){
			var parameters = E.cylinder(mesh0, p0);
			if(!parameters){return;}
      // Cylinder
      var geometry = new THREE.CylinderGeometry(parameters.r, parameters.r, parameters.h, 20),
      	material = new THREE.MeshBasicMaterial({color: 0xffff00}),
      	cylinder = new THREE.Mesh(geometry, material);
      cylinder.position.set(parameters.xc, parameters.yc, parameters.zc);
			items.push(cylinder);
      scene.add(cylinder);
			parameters.points = cylinder;
			return parameters;
    },
    plane: function(mesh0, p0){
			var parameters = E.plane(mesh0, p0);
			if(!parameters){return;}

			var normal_frame = new THREE.Vector3().fromArray(parameters.normal);
      var quat_rot = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normal_frame
      );
			var mat4_frame = new THREE.Matrix4().makeRotationFromQuaternion(quat_rot);
			var mat4inv_frame = new THREE.Matrix4().getInverse(mat4_frame, true);
			var invrot = get_THREE_mat4(mat4inv_frame);

			var norm_robot_frame = new THREE.Vector3().fromArray(
				[parameters.normal[2], parameters.normal[0], parameters.normal[1]]
			);
      var quat_rot_robot_frame = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        norm_robot_frame
      );
			var mat4_robot_frame = new THREE.Matrix4().makeRotationFromQuaternion(quat_rot_robot_frame);
			parameters.rot = get_THREE_mat4(mat4_robot_frame);

			var points0 = parameters.points.map(function(p){
				return [p[0] - this[0], p[1] - this[1], p[2] - this[2]];
			}, parameters.root);

			var points0inv = points0.map(function(v){
				var vv = mat_times_vec(this, v);
				vv.pop();
				return vv;
			}, invrot);

			//console.log('points0', points0);
			//console.log('points0inv', points0inv);

			var poly = E.find_poly(points0inv);
			console.log(poly);

      parameters.poly = poly;
      // Classify:
      var poly_features = Classify.poly_features;
      var pf = Classify.get_poly_features(parameters);
      parameters.features = pf;

/*
      var material = new THREE.LineBasicMaterial({
      	color: pf[poly_features.indexOf('ground')] > 20 ? 0x00ff00 : 0xFF9900,
        linewidth: 20
      });
*/
			var material = new THREE.LineBasicMaterial({
				color: 0x000000, linewidth: 20
			});
      var geometry = new THREE.Geometry();

      // Send to the map
      if(parameters.id==='v'){
				// TODO: Tweak
				geometry.vertices = poly.rhoDist.map(function(r, idx, arr){
					var a = angle_idx_inv(idx, arr.length),
						x = Math.sin(a)*r,
						z = -Math.cos(a)*r;
					return (new THREE.Vector3(x, 0, z)).applyQuaternion(quat_rot);
				});

        var makeDot = function(p){ return numeric.dot([p.x, p.z], this); };
        var dir1 = [-parameters.normal[2], parameters.normal[0]];
        var dir2 = [parameters.normal[2], -parameters.normal[0]];
        parameters.endpoints = [];
        var maxPoint1 = geometry.vertices[
          geometry.vertices.map(makeDot, dir1).reduce(minDotI, 0)
        ];
        parameters.endpoints.push([
          (maxPoint1.z + parameters.root[2])/1e3,
					(maxPoint1.x + parameters.root[0])/1e3
        ]);
        var maxPoint2 = geometry.vertices[
          geometry.vertices.map(makeDot, dir2).reduce(minDotI, 0)
        ];
        parameters.endpoints.push([
					(maxPoint2.z + parameters.root[2])/1e3,
          (maxPoint2.x + parameters.root[0])/1e3
        ]);
      } else if(parameters.id==='h'){
				// Vertices here
				geometry.vertices = poly.xy.map(function(p){
					return (new THREE.Vector3(p[1], 10, p[0])).applyQuaternion(quat_rot);
				});
				// Into 2D
				parameters.projected = {
					root : [parameters.root[2]/1e3, parameters.root[0]/1e3],
					xy : geometry.vertices.map(function(p){return [p.z/1e3, p.x/1e3];}),
					resolution : parameters.poly.resolution
				};

      }

			// close the loop
			geometry.vertices.push(geometry.vertices[geometry.vertices.length-1]);

			var line = new THREE.Line( geometry, material );
			line.position.fromArray(parameters.root);
			scene.add(line);

			parameters.points = line;

      /*
      var geometry = new THREE.SphereGeometry( 50, 16, 16 );
      var material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
      var marker = new THREE.Mesh(geometry, material);
      marker.position.fromArray(parameters.root);
      scene.add(marker);
      */
      /*
      E.paint(parameters);
      mesh0.geometry.getAttribute('color').needsUpdate = true;
      */
			return parameters;
    }
  };

	var last_selected_parameters = null;

	function estimate_selection(){
		// Run the descriptor
		var cyl, pl;
		cyl = describe.cylinder(last_intersection.mesh, last_intersection.p);
		if(cyl){
			last_selected_parameters = cyl;
			return;
		}
		pl = describe.plane(last_intersection.mesh, last_intersection.p);
		if(pl){
			last_selected_parameters = pl;
			return;
		}
	}

	// Refocus the camera
	function focus_object(e){
		// Not a short click refocus
		//console.log(e.timeStamp - last_intersection.t);
		if(e.timeStamp - last_intersection.t>90){
			return;
		}
		var menu = document.getElementById('topic2');
		if (e.button === 0) {
			// Left click
			if(!menu.classList.contains('hidden')){
				menu.classList.add('hidden');
				last_selected_parameters = null;
				return;
			}
			// Not moving around
			if (!controls.enabled) { return; }
			// Set the new target look
			controls.target = last_intersection.p;
		} else {
			// Right click
			menu.classList.toggle('hidden');
			menu.style.left = e.offsetX+'px';
			menu.style.top = e.offsetY+'px';
			console.log('clicked name',last_intersection.mesh.name);
			// If clicked the mesh, run the processing
			if(last_intersection.mesh.name === 'kinectV2'){
				window.setTimeout(estimate_selection, 0);
			}
		}
	}

	// Select an object to rotate around, or general selection for other stuff
	// TODO: Should work for right or left click...?
	// Only Right click...?
	function select_object(e) {

		// find the mouse position (use NDC coordinates, per documentation)
		var mouse_vector = new THREE.Vector3((e.offsetX / CANVAS_WIDTH) * 2 - 1, 1 - (e.offsetY / CANVAS_HEIGHT) * 2).unproject(camera);
    // Form the raycaster for the camera's current position
    raycaster.ray.set(camera.position, mouse_vector.sub( camera.position ).normalize());
    // Find the intersections with the various meshes in the scene
    var intersections = raycaster.intersectObjects(items.concat(meshes).concat(robot.meshes));
		// Return if no intersections
		if (intersections.length === 0) {
			return;
		}
		// Grab the first intersection object and the intersection point
		var obj0 = intersections[0];
		if(obj0.name==='ground' && intersections[1]){
			obj0 = intersections[1];
		}
		var p0 = obj0.point, mesh0 = obj0.object;

		// Save the intersection for a mouseup refocus
		last_intersection.p = p0;
		last_intersection.mesh = mesh0;
		last_intersection.t = e.timeStamp;



    // Solve for the transform from the robot frame to the point
		/*
    T_? * T_Robot = T_point
    T_? = T_point * T_Robot ^ -1
    */

		var T_point = new THREE.Matrix4().makeTranslation(p0.x, p0.y, p0.z),
			T_inv = new THREE.Matrix4().getInverse(robot.object.matrix),
			T_offset = new THREE.Matrix4().multiplyMatrices(T_point, T_inv);

    // Debugging
    sprintf.apply({},['%0.2f %f', 1,2, 55]);
    var offset_msg = new THREE.Vector3().setFromMatrixPosition(T_offset).divideScalar(1000).toArray();
    //offset_msg.unshift('Offset: %0.2f %0.2f %0.2f');
    var global_msg = new THREE.Vector3().setFromMatrixPosition(T_point).divideScalar(1000).toArray();
    global_msg.unshift('Global: %0.2f %0.2f %0.2f');
		//console.log(offset_msg);
    debug([
      obj0.object.name,
			sprintf("Offset: %0.2f %0.2f %0.2f", offset_msg[2], offset_msg[0], offset_msg[1]),
      //sprintf.apply(null, offset_msg),
      //sprintf.apply(null, global_msg)
    ]);

		// Default gives a text cursor
		if (e.button !== 2) { return; }
		e.preventDefault();

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
		// mesh should be phong, kinect basic...
		var mesh_obj = e.data,
      geometry = new THREE.BufferGeometry(),
			material = new THREE.MeshPhongMaterial({
      //material = new THREE.MeshBasicMaterial({
				side: THREE.DoubleSide,
        // Enable all color channels. Super important for vertex colors!
				color: 0xFFFFFF,
        // Fill the color channels with the colors attribute through the vertex shader
        vertexColors: THREE.VertexColors,
        // TODO: Check the extra Phong parameters
        ambient: 0xffffff, specular: 0x000, shininess: 100,
			}),
			mesh;

		//console.log(mesh_obj);

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
    mesh.n_el = mesh_obj.n_el;
		if(meshes.length >= N_MESH){
			scene.remove(meshes.shift());
		}
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
    is_processing = false;
	}

	// Process the frame, which is always the chest lidar
	function process_mesh_frame() {
    if (is_processing) { return; }
		var canvas = mesh_feed.canvas,
			metadata = canvas.metadata,
			width = canvas.width,
			height = canvas.height,
			npix = width * height,
			pixels = mesh_feed.context2d.getImageData(0, 0, width, height).data;

		var mesh_obj = {
        id: 'mesh',
				width: width,
				height: height,
				hfov: metadata.sfov,
				vfov: metadata.rfov,
				dynrange: metadata.dr,
				a: metadata.a,
				torso: metadata.torso,
				// Make the max allocations
				// TODO: Can we reuse these?
        index: new Uint16Array(npix * 6),
				positions: new Float32Array(npix * 3),
				colors: new Float32Array(npix * 3),
        pixels: pixels,
        pixdex: new Uint32Array(pixels.buffer),
			};

    depth_worker.postMessage(mesh_obj, [
      mesh_obj.index.buffer,
      mesh_obj.positions.buffer,
      mesh_obj.colors.buffer,
      mesh_obj.pixels.buffer,
    ]);
    // Don't post to the depth worker until done
    is_processing = true;

	}


  function process_kinectV2_color(){
    cur_rgb = rgb_canvas.metadata;
    //console.log('color', cur_rgb);
    if (cur_depth) {
      rgbd_metadata.pixels = cur_depth;
      rgbd_metadata.rgb = rgb_ctx.getImageData(0, 0, cur_rgb.width, cur_rgb.height).data;
      cur_rgb = null;
      cur_depth = null;
      post_rgbd();
    }
  }
	function process_kinectV2_depth(e) {
		if (typeof e.data === 'string') {
			rgbd_metadata = JSON.parse(e.data);
      //console.log('depth', rgbd_metadata);
			if (rgbd_metadata.t !== undefined) {
				// Add latency measure if possible
				rgbd_metadata.latency = (e.timeStamp / 1e3) - rgbd_metadata.t;
			}
		} else {
		  //rgbd_metadata.pixels = new window.Float32Array(e.data);
      cur_depth = new window.Float32Array(e.data);
      if (cur_rgb) {
        rgbd_metadata.pixels = cur_depth;
        rgbd_metadata.rgb = rgb_ctx.getImageData(0, 0, cur_rgb.width, cur_rgb.height).data;
        cur_rgb = null;
        cur_depth = null;
        post_rgbd();
      }
		}
	}

  function post_rgbd(){
    // Don't post to the depth worker until done
    if (is_processing) { return; }
    is_processing = true;

    //console.log(rgbd_metadata.rgb[0], rgbd_metadata.rgb[1920*4]);

    // Allocations
    // TODO: Maintain a fixed set of allocations to avoid penalty on each new data
    var npix = rgbd_metadata.height * rgbd_metadata.width;
    rgbd_metadata.index = new window.Uint16Array(npix * 6);
		rgbd_metadata.positions = new window.Float32Array(npix * 3);
    rgbd_metadata.colors = new window.Float32Array(npix * 3);
    rgbd_metadata.pixdex = new window.Uint32Array(rgbd_metadata.pixels.buffer);
		depth_worker.postMessage(rgbd_metadata,[
      rgbd_metadata.index.buffer,
      rgbd_metadata.positions.buffer,
      rgbd_metadata.colors.buffer,
      rgbd_metadata.pixels.buffer,
      rgbd_metadata.rgb.buffer
    ]);
  }

	// Add the camera view and append
	function setup3d() {

		THREE = ctx.THREE;
		scene = new THREE.Scene();
    raycaster = new THREE.Raycaster();

		// Build the scene
		var spotLight,
			ground = new THREE.Mesh(
				new THREE.PlaneBufferGeometry(100000, 100000),
				new THREE.MeshBasicMaterial({
					side: THREE.DoubleSide,
					color: 0x7F5217
				})
			);
		CANVAS_WIDTH = container.clientWidth;
		CANVAS_HEIGHT = container.clientHeight;
		renderer = new THREE.WebGLRenderer({
			antialias: false
		});
		renderer.setClearColor(0x80CCFF, 1);
		renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
		container.appendChild(renderer.domElement);
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
		ground.position.y = -100;
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
    util.ljs('/Robot.js', function(){
  		d3.json('/streams/feedback', function (error, port) {
  			// Load the robot
  			robot = new ctx.Robot({
  				scene: scene,
  				port: port
  			});
  		});
    });

    // RealTime Comms to other windows
    setup_rtc();

	}

	function setup_rtc (){
		peer = new Peer(peer_id, {host: 'localhost', port: 9000});
		peer.on('open', function(id) {
			console.log('My peer ID is: ' + id);
		});
		peer.on('disconnected', function(conn) { console.log('disconnected'); });
		peer.on('error', function(e) { console.log('error', e); });
		peer.on('close', function() { console.log('close'); });
		peer.on('connection', function(conn) {
			map_peers.push(conn);
			conn.on('data', function(data){
				console.log('map data',data);
			});
			conn.on('close', function(){
				// remove from map_peers
				map_peers.shift();
				console.log('closed conn');
			});
		});
	}

  ctx.util.ljs('/Estimate.js', function(){
    E = ctx.Estimate;
  });
  ctx.util.ljs('/Classify.js', function(){
    Classify = ctx.Classify;
  });

	// Load the Styling
	ctx.util.lcss('/css/gh-buttons.css');
	ctx.util.lcss('/css/all_scene.css', function () {
		d3.html('/view/all_scene.html', function (error, view) {
			// Remove landing page elements and add new content
			d3.select("div#landing").remove();
			// Just see the scene
			document.body.appendChild(view);
      ctx.util.ljs('/bc/threejs/build/three.js', setup3d);
			// Menu
			d3.select("body").on('contextmenu',function (e) {
				//d3.event.preventDefault();

			});
			container = document.getElementById('world_container');
			// Object selection
			container.addEventListener('mousedown', select_object, false);
			container.addEventListener('mouseup', focus_object, false);

			d3.select('button#reset').on('click', function(){
				// [x center, y center, z center, radius, height]
				d3.json('/raw/reset').post(JSON.stringify("state_ch:send('reset')"));
			});

			/*
			// User interactions
			selection = d3.select('select#objects').node();
			d3.select('button#look').on('click', function(){
				controls.enabled = true;
			});
			d3.select('button#draw').on('click', function(){
				controls.enabled = false;
			});
			*/
			d3.selectAll('#topic2 li').on('click', function(){
				document.getElementById('topic2').classList.add('hidden');
				var action = this.getAttribute('data-action');
				// Need parameters
				if(!last_selected_parameters){ return; }
				console.log('Action', action);
				switch(action){
					case 'clear':
						scene.remove(last_selected_parameters.points);
						delete last_selected_parameters.points;
						break;
					default:
						delete last_selected_parameters.points;
						last_selected_parameters.type = action;
						map_peers.forEach(function(conn){ conn.send(this); }, last_selected_parameters);
						console.log('Sending', last_selected_parameters);
						break;
				}
				// Reset the parameters
				last_selected_parameters = null;
			});
		});
	});

	// Depth Worker for both mesh and kinect
	depth_worker = new window.Worker("/allmesh_worker.js");
	depth_worker.onmessage = process_mesh;

	// Begin listening to the feed
  util.ljs("/VideoFeed.js",function(){
  	d3.json('/streams/mesh', function (error, port) {
  		mesh_feed = new ctx.VideoFeed({
  			port: port,
  			fr_callback: process_mesh_frame,
  			//cw90: true
  		});
  	});
  	d3.json('/streams/kinect2_color', function (error, port) {
  		rgb_feed = new ctx.VideoFeed({
  			id: 'kinect2_color',
  			port: port,
  			fr_callback: process_kinectV2_color
  		}
      );
  		rgb_ctx = rgb_feed.context2d;
      rgb_canvas = rgb_feed.canvas;
  	});
  });
	// Add the depth rgb_feed
	d3.json('/streams/kinect2_depth', function (error, port) {
		var depth_ws = new window.WebSocket('ws://' + window.location.hostname + ':' + port);
		depth_ws.binaryType = 'arraybuffer';
		depth_ws.onmessage = process_kinectV2_depth;
	});

}(this));
