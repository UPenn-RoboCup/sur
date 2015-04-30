(function (ctx) {
	'use strict';
	// Private variables
	var d3 = ctx.d3,
		util = ctx.util,
    container, renderer, camera, E, THREE,
		scene, raycaster, CANVAS_WIDTH, CANVAS_HEIGHT,
		controls, tcontrol, selection,
		robot, planRobot, items = [],
		mesh0_feed, mesh1_feed, kinect_feed,
		mesh0 = [], mesh1 = [], kinect = [],
		N_MESH0 = 1, N_MESH1 = 1, N_KINECT = 1,
    peer, p_conn, map_peers = [],
    peer_id = 'all_scene', peer_map_id = 'all_map',
		last_intersection = {t:0}, last_selected_parameters = null;;

  var describe = {
    cylinder: function(mesh, p){
			var parameters = E.cylinder(mesh, p);
			if(!parameters){return;}
      // Draw Cylinder
      var geometry = new THREE.CylinderGeometry(parameters.r, parameters.r, parameters.h, 20),
      	material = new THREE.MeshBasicMaterial({color: 0xffff00}),
      	cylinder = new THREE.Mesh(geometry, material);
      cylinder.position.set(parameters.xc, parameters.yc, parameters.zc);
			items.push(cylinder);
      scene.add(cylinder);
			parameters.mesh = cylinder;
			return parameters;
    },
    plane: function(mesh, p){
			var parameters = E.plane(mesh, p);
			if(!parameters){return;}
			var root = parameters.root;
			// THREE frame
			var normal = new THREE.Vector3().fromArray(parameters.normal);
      var quatNormal = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normal
      );
			var matNormal = new THREE.Matrix4().makeRotationFromQuaternion(quatNormal);
			var matNormalInv = new THREE.Matrix4().getInverse(matNormal, true);
			// Robot Frame
			var normalRobot = new THREE.Vector3(
				parameters.normal[2], parameters.normal[0], parameters.normal[1]
			);
      var quatNormalRobot = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normalRobot
      );
			var matNormalRobot =
					new THREE.Matrix4().makeRotationFromQuaternion(quatNormalRobot);

			// Place the points into a zero-centered, flat space
			var points0 = parameters.points.map(function(p){
				return [p[0] - this[0], p[1] - this[1], p[2] - this[2]];
			}, root);
			var points0inv = points0.map(function(v){
				return util.mat3_times_vec(this, v);
			}, util.get_THREE_mat3(matNormalInv));
			// Find perimeter in flat space
			var perimInv = E.find_poly(points0inv);
			// Place back into the original space
			var rho = perimInv.map(function(p){ return p.pop(); });
			var perim = perimInv.map(function(v){
				return util.mat3_times_vec(this, v);
			}, util.get_THREE_mat3(matNormal));

			// Append Robot Frame parameters
			parameters.perimeter = perim.map(function(p){
				return [p[2], p[0], p[1]].map(function(v){return v/1e3;});
			});
			parameters.rho = rho;
			parameters.rot = util.get_THREE_mat3(matNormalRobot);
			parameters.normal = normalRobot.toArray();
			parameters.root = [parameters.root[2], parameters.root[0], parameters.root[1]]
				.map(function(v){return v/1e3;});
			// NOTE: cov is still in THREE coordinates

			// Add the vertices for the line
			var geometry = new THREE.Geometry();
			geometry.vertices = perim.map(function(p){
				return new THREE.Vector3(p[0], p[1], p[2]);//.applyQuaternion(quatNormal);
			});
			// Close the loop
			geometry.vertices.push(geometry.vertices[0]);
			// Form material
			var material = new THREE.LineBasicMaterial({
				color: 0x000000, linewidth: 20
			});
			// Add to the scene
			var line = new THREE.Line(geometry, material);
			line.position.fromArray(root);
			scene.add(line);
			// Deal with the raw points and GUI mesh
			parameters.mesh = line;
			delete parameters.points;

			return parameters;
    }
  };

	function estimate_selection(){
		// Run the descriptor
		var cyl, pl;
		//cyl = describe.cylinder(last_intersection.mesh, last_intersection.p);
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
			return;
		}
		// Right click
		menu.classList.toggle('hidden');
		menu.style.left = e.offsetX+'px';
		menu.style.top = e.offsetY+'px';
		// If clicked the mesh, run the processing
		if(last_intersection.mesh.name !== 'GROUND'){
			window.setTimeout(estimate_selection, 0);
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
		//var allitems = items.concat(robot.meshes).concat(kinect).concat(mesh0).concat(mesh1);
		var allitems =
				items.concat(robot.meshes).concat(planRobot.meshes)
		.concat(kinect).concat(mesh0).concat(mesh1);

    var intersections = raycaster.intersectObjects(allitems);
		// Return if no intersections
		if (intersections.length === 0) {
			return;
		}
		// Grab the first intersection object and the intersection point
		var obj = intersections[0];
		if(obj.name==='GROUND' && intersections[1]){
			obj = intersections[1];
		}
		var p = obj.point, mesh = obj.object;

		// Save the intersection for a mouseup refocus
		last_intersection.p = p;
		last_intersection.mesh = mesh;
		last_intersection.t = e.timeStamp;

    // Solve for the transform from the robot frame to the point
		/*
    T_? * T_Robot = T_point
    T_? = T_point * T_Robot ^ -1
    */

		var T_point = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z),
			T_inv = new THREE.Matrix4().getInverse(robot.object.matrix),
			T_offset = new THREE.Matrix4().multiplyMatrices(T_point, T_inv);

    // Debugging
    sprintf.apply({},['%0.2f %f', 1,2, 55]);
    var offset_msg = new THREE.Vector3().setFromMatrixPosition(T_offset).divideScalar(1000).toArray();
    //offset_msg.unshift('Offset: %0.2f %0.2f %0.2f');
    var global_msg = new THREE.Vector3().setFromMatrixPosition(T_point).divideScalar(1000).toArray();
    global_msg.unshift('Global: %0.2f %0.2f %0.2f');
		//console.log(offset_msg);
    util.debug([
      mesh.name,
			sprintf("Offset: %0.2f %0.2f %0.2f", offset_msg[2], offset_msg[0], offset_msg[1]),
      //sprintf.apply(null, offset_msg),
      //sprintf.apply(null, global_msg)
    ]);

		// Default gives a text cursor
		if (e.button !== 2) { return; }
		e.preventDefault();

	}

	// Adds THREE buffer geometry from triangulated mesh to the scene
	function process_mesh(mesh_obj) {

		// mesh should be phong, kinect basic...
		var geometry = new THREE.BufferGeometry(),
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
    mesh.name = mesh_obj.id;
    mesh.n_el = mesh_obj.n_el;
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

		if(mesh.name==='mesh0'){
			mesh0.push(mesh);
			if(mesh0.length > N_MESH0){ scene.remove(mesh0.shift()); }
		} else if(mesh.name==='mesh1'){
			mesh1.push(mesh);
			if(mesh1.length > N_MESH1){ scene.remove(mesh1.shift()); }
		} else if(mesh.name==='kinect'){
			kinect.push(mesh);
			if(kinect.length > N_KINECT){ scene.remove(kinect.shift()); }
		}

	}

	// Load the Styling
	ctx.util.lcss('/css/gh-buttons.css');
	ctx.util.lcss('/css/all_scene.css', function () {
		d3.html('/view/all_scene.html', function (error, view) {
			// Remove landing page elements and add new content
			d3.select("div#landing").remove();
			// Just see the scene
			document.body.appendChild(view);
			// Menu
			d3.select("body").on('contextmenu',function (e) {
				//d3.event.preventDefault();

			});
			container = document.getElementById('world_container');
			// Object selection
			container.addEventListener('mousedown', select_object, false);
			container.addEventListener('mouseup', focus_object, false);

			d3.select('button#ghost').on('click', function(){
				planRobot.meshes.forEach(function(m, i){
					m.quaternion.copy(this[i].quaternion);
				}, robot.meshes);
				planRobot.object.position.copy(robot.object.position);
				planRobot.object.quaternion.copy(robot.object.quaternion);
				planRobot.object.visible = !planRobot.object.visible;
			});

			d3.select('button#move').on('click', function(){
				// [x center, y center, z center, radius, height]
				//d3.json('/raw/reset').post(JSON.stringify("state_ch:send('reset')"));
				//console.log(tcontrol);
				if(tcontrol.object){
					tcontrol.detach();
					//planRobot.object.visible = false;
					this.innerHTML = 'Move'
					tcontrol.enableY = true;
					return;
				}
				this.innerHTML = 'Go!'
				planRobot.object.visible = true;
				tcontrol.setMode('translate');
				tcontrol.space = 'local';
				tcontrol.enableY = false;
				tcontrol.attach(planRobot.object);
				//
				planRobot.meshes.forEach(function(m, i){
					m.quaternion.copy(this[i].quaternion);
				}, robot.meshes);
				planRobot.object.position.copy(robot.object.position);
				planRobot.object.quaternion.copy(robot.object.quaternion);
			});

			d3.select('button#teleop').on('click', function(){
				if(tcontrol.object){
					tcontrol.detach();
					//planRobot.object.visible = false;
					this.innerHTML = 'Teleop'
					tcontrol.enableY = true;
					tcontrol.enableZ = true;
					tcontrol.enableXYZE = true;
					tcontrol.enableE = true;
					return;
				}
				var sel = document.getElementById('joints');
				var motor = planRobot.object.getObjectByName(sel.value);
				if(!motor){return;}
				this.innerHTML = 'Go Teleop!'
				planRobot.object.visible = true;
				tcontrol.setMode('rotate');
				tcontrol.space = 'local';
				tcontrol.enableY = false;
				tcontrol.enableZ = false;
				tcontrol.enableXYZE = false;
				tcontrol.enableE = false;
				tcontrol.attach(motor);
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
						scene.remove(last_selected_parameters.mesh);
						delete last_selected_parameters.mesh;
						break;
					default:
						delete last_selected_parameters.mesh;
						last_selected_parameters.type = action;
						map_peers.forEach(function(conn){ conn.send(this); }, last_selected_parameters);
						console.log('Sending', last_selected_parameters);
						break;
				}
				// Reset the parameters
				last_selected_parameters = null;
			});

			setTimeout(setup, 0);

		});
	});

	util.ljs("/VideoFeed.js", function(){
		// Begin listening to the feed
		util.ljs("/MeshFeed.js", function(){
			d3.json('/streams/mesh0', function (error, port) {
				mesh0_feed = new ctx.MeshFeed(port, process_mesh);
			});
			d3.json('/streams/mesh1', function (error, port) {
				mesh1_feed = new ctx.MeshFeed(port, process_mesh);
			});
		});
		util.ljs("/KinectFeed.js", function(){
			d3.json('/streams/kinect2_color', function (error, rgb) {
				d3.json('/streams/kinect2_depth', function (error, depth) {
					kinect_feed = new ctx.KinectFeed(rgb, depth, process_mesh);
				});
			});
		});
	}); // Needed by other feeds
  ctx.util.ljs('/Estimate.js', function(){ E = ctx.Estimate; });
  ctx.util.ljs('/Classify.js', function(){ Classify = ctx.Classify; });

	function setup(){
		ctx.util.ljs('/bc/threejs/build/three.js', function(){
			THREE = ctx.THREE;
			setTimeout(setup3d, 0);
			setTimeout(setup_rtc, 0);
		});
	}

	// Add the camera view and append
	function setup3d() {
		scene = new THREE.Scene();
    raycaster = new THREE.Raycaster();
		// Build the scene
		var spotLight,
			ground = new THREE.Mesh(
				new THREE.PlaneBufferGeometry(100000, 100000),
				new THREE.MeshBasicMaterial({
					side: THREE.DoubleSide,
					color: 0x7F5217,
					transparent: true, opacity: 0.75
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
		ground.position.y = 0;
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
  				port: port,
					name: 'thorop2'
  			});
  		});
			planRobot = new ctx.Robot({
				scene: scene,
				name: 'thorop2',
				callback: function(){
					var clearMaterial = new THREE.MeshBasicMaterial({
						color: 0x00ff00,
						transparent: true,
						opacity: 0.5,
					});
					planRobot.meshes.forEach(function(m){ m.material = clearMaterial; });
					planRobot.object.getObjectByName('L_FOOT').material = clearMaterial;
					planRobot.object.getObjectByName('R_FOOT').material = clearMaterial;
					planRobot.object.getObjectByName('L_WR_FT').material = clearMaterial;
					planRobot.object.getObjectByName('R_WR_FT').material = clearMaterial;
					planRobot.object.visible = false;
					// Joint teleop
					var sel = document.getElementById('joints');
					console.log(sel);
					planRobot.meshes.forEach(function(m){
						var x = document.createElement("OPTION");
						if(!m.name){return;}
						x.value = m.name;
						x.innerHTML = m.name;
						sel.appendChild(x);
					});

				}
			});
    });
		// Able to move the robot around
		util.ljs("/TransformControls.js", function(){
			tcontrol = new THREE.TransformControls( camera, renderer.domElement );
			scene.add(tcontrol);
		});
	} //done 3d

	function setup_rtc(){
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

	// Constantly animate the scene
	function animate() {
		if (controls) {
			controls.update();
		}
		renderer.render(scene, camera);
		window.requestAnimationFrame(animate);
	}

}(this));
