(function (ctx) {
	'use strict';
	// Private variables
	var RAD_TO_DEG = util.RAD_TO_DEG,
    container, renderer, camera,
		scene, raycaster, CANVAS_WIDTH, CANVAS_HEIGHT,
		controls, tcontrol,
		robot, planRobot, items = [],
		mesh0_feed, mesh1_feed, kinect_feed,
		mesh0 = [], mesh1 = [], kinect = [],
		N_MESH0 = 1, N_MESH1 = 1, N_KINECT = 1,
		map_peers = [],
		last_intersection = {t:0}, last_selected_parameters = null;

	function procPlan(plan) {
		var true_hz = 120, subsample = 0.5, half_sec = Math.floor(true_hz * subsample),
				speedup = 4, play_rate = Math.floor(1e3 * subsample / speedup);
		function halfsec(v, i, arr) {
			return (i % half_sec)===0 || i===arr.length;
		}
		function updatechain(frame){
			var chain_ids = this;
			frame[1].forEach(function(v, i){
				planRobot.setJoints(v, chain_ids[i]);
			});
		}

		var lplan = plan[0].length ? plan[0] : [],
				rplan = plan[1].length ? plan[1] : [],
				wplan = plan[2].length ? plan[2] : [];

		lplan = lplan.filter(halfsec);
		rplan = rplan.filter(halfsec);
		wplan = wplan.filter(halfsec);

		/*
		console.log('lplan', lplan);
		console.log('rplan', rplan);
		console.log('wplan', wplan);
		*/

		// TODO: catch on bad plan or user cancel
		return Promise.all([
			util.loop(lplan, updatechain.bind(planRobot.IDS_LARM), play_rate),
			util.loop(rplan, updatechain.bind(planRobot.IDS_RARM), play_rate),
			util.loop(wplan, updatechain.bind(planRobot.IDS_WAIST), play_rate),
		]);
	}

  var describe = {
    cylinder: function(mesh, p){
			var parameters = Estimate.cylinder(mesh, p);
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
			var parameters = Estimate.plane(mesh, p);
			if(!parameters){return;}
			var root = parameters.root;
			// THREE frame
			var normal = new THREE.Vector3().fromArray(parameters.normal);
      var quatNormal = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normal
      );
			var rpy = new THREE.Euler().setFromQuaternion(quatNormal);
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
			var perimInv = Estimate.find_poly(points0inv);
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
			if(parameters.id==='v'){
				var a = Math.atan2(normal.x, normal.z);
				parameters.rpy = [0, 0, a];
			} else {
				parameters.rpy = [rpy.z, rpy.x, 0];
			}
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
			// Store some threejs items
			parameters.three = {
				normal: normal,
				quaternion: quatNormal,
				position: line.position.clone()
			};
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

	// Adds THREE buffer geometry from triangulated mesh to the scene
	function process_mesh(mesh_obj) {
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
			});
    // Custom attributes required for rendering the BufferGeometry
    geometry.addAttribute('index', new THREE.BufferAttribute(mesh_obj.idx, 1));
		geometry.addAttribute('position', new THREE.BufferAttribute(mesh_obj.pos, 3));
		geometry.addAttribute('color', new THREE.BufferAttribute(mesh_obj.col, 3));
    for(var i = 0; i<mesh_obj.drawCalls.length; i++){
      geometry.addDrawCall(
        mesh_obj.drawCalls[i].start, mesh_obj.drawCalls[i].count, mesh_obj.drawCalls[i].index
      );
    }
		// Dynamic, because we will do raycasting; also need bounding info
		geometry.dynamic = true;
		geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
		// Phong Material requires normals for reflectivity
    // TODO: Perform the normals computation in the Worker thread maybe?
		geometry.computeVertexNormals();
		var mesh = new THREE.Mesh(geometry, material);
    mesh.name = mesh_obj.id;
    mesh.n_el = mesh_obj.n_el;
		scene.add(mesh);
		// Save a set of meshes
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
	} // process_mesh

	function setup_clicks(){
		// Object selection
		container.addEventListener('mousedown', function (e) {
			// Find the mouse position (use NDC coordinates, per documentation)
			var mouse_vector = new THREE.Vector3((e.offsetX / CANVAS_WIDTH) * 2 - 1, 1 - (e.offsetY / CANVAS_HEIGHT) * 2).unproject(camera);
			// Form the raycaster for the camera's current position
			raycaster.ray.set(camera.position, mouse_vector.sub( camera.position ).normalize());
			// Find the intersections with the various meshes in the scene
			var allitems = items.concat(robot.meshes).concat(planRobot.meshes)
				.concat(kinect).concat(mesh0).concat(mesh1);
			var intersections = raycaster.intersectObjects(allitems);
			if (intersections.length === 0) { return; }
			// Grab the first intersection object and the intersection point
			var obj = intersections[0];
			if(obj.name==='GROUND' && intersections[1]){ obj = intersections[1]; }
			var p = obj.point, mesh = obj.object;
			// Save the intersection for a mouseup refocus
			last_intersection.p = p;
			last_intersection.mesh = mesh;
			last_intersection.t = e.timeStamp;
			// Solve for the transform from the robot frame to the point
			var T_point = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z),
				T_inv = new THREE.Matrix4().getInverse(robot.object.matrix),
				T_offset = new THREE.Matrix4().multiplyMatrices(T_point, T_inv);
			// Debugging
			var offset_msg = new THREE.Vector3().setFromMatrixPosition(T_offset).divideScalar(1e3).toArray();
			var global_msg = new THREE.Vector3().setFromMatrixPosition(T_point).divideScalar(1e3).toArray();

			// Default gives a text cursor
			if (e.button === 1) {
				// Middle click
				util.debug([
					mesh.name,
					sprintf("Offset: %0.2f %0.2f %0.2f", offset_msg[2], offset_msg[0], offset_msg[1]),
					sprintf("Global: %0.2f %0.2f %0.2f", global_msg[2], global_msg[0], global_msg[1]),
				]);
				return;
			}

			e.preventDefault();
		});
		// Refocus the camera
		container.addEventListener('mouseup', function (e){
			var tdiff_ms = e.timeStamp - last_intersection.t;
			// Not a short click refocus
			if(tdiff_ms > 90){ return; }
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
			} else if (e.button === 2) {
				// Right click
				if(last_intersection.mesh.name==='GROUND'){ return; }
				// If clicked the mesh, run the processing
				menu.classList.toggle('hidden');
				menu.style.left = e.offsetX + 'px';
				menu.style.top = e.offsetY + 'px';
				setTimeout(estimate_selection, 0);
			}
		});
		//var footname = document.querySelector('button#step').getAttribute('data-foot');
		d3.selectAll('#topic2 li').on('click', function(){
			var params = last_selected_parameters;
			if(!params){ return; }
			last_selected_parameters = null;
			document.getElementById('topic2').classList.add('hidden');
			var action = this.getAttribute('data-action');
			var debugMsg = [];
			debugMsg.push(action);
			switch(action){
				case 'clear':
					scene.remove(params.mesh);
					return;
				case 'step':
					var gfoot = planRobot.foot;
					var footname = document.querySelector('button#step').getAttribute('data-foot');
					var worldFoot = robot.object.getObjectByName(footname).matrixWorld;
					var p3 = params.three.position.clone();
					p3.sub(
						new THREE.Vector3().setFromMatrixPosition(worldFoot)
					);
					gfoot.position.copy(p3);

					var qFootInv = new THREE.Quaternion()
						.setFromRotationMatrix(worldFoot).inverse();
					gfoot.quaternion.multiplyQuaternions(
						params.three.quaternion, qFootInv
					);
					debugMsg.push(footname);
					// Print (L: Local, G: Global)
					var pL = gfoot.position;
					//var pG = params.root;
					//var rpyL = new THREE.Euler().setFromQuaternion(gfoot.quaternion);
					var rpyG = params.rpy; // global
					debugMsg.push(sprintf("RPY: %0.2f %0.2f %0.2f", rpyG[0], rpyG[1], rpyG[2]));
					debugMsg.push(sprintf("XYZ: %0.2f %0.2f %0.2f", pL.z, pL.x, pL.y));
					break;
				case 'avoid':
					//console.log(params);
										/*
					var qRobotInv = robot.object.quaternion.clone().inverse();
					var q = new THREE.Quaternion().multiplyQuaternions(
						params.three.quaternion, qRobotInv
					);
					*/
					break;
				default:
					break;
			}

			util.debug(debugMsg);
			// For sending over WebRTC, we remove silly things
			params.type = action;
			delete params.mesh;
			delete params.three;
			map_peers.forEach(function(conn){ conn.send(params); });
		});
	} // setup_clicks

	function setup_buttons(){
		var resetBtn = document.querySelector('button#reset'),
			goBtn = document.querySelector('button#go'),
			moveBtn = document.querySelector('button#move'),
			teleopBtn = document.querySelector('button#teleop'),
			stepBtn = document.querySelector('button#step'),
			ikBtn = document.querySelector('button#ik'),
			jointSel = document.querySelector('select#joints'),
			initBtn = document.querySelector('button#init'),
			readyBtn = document.querySelector('button#ready'),
			allBtns = document.querySelectorAll('#topic button');
		function getMode() {
			for(var i = 0; i<allBtns.length; i+=1){
				var btn = allBtns.item(i);
				if(btn.innerHTML==='Done') { return btn.id; }
			}
		}
		function resetLabels() {
			for(var i = 0; i<allBtns.length; i+=1){
				var btn = allBtns.item(i);
				btn.innerHTML = btn.name;
			}
		}

		jointSel.addEventListener('change', function(){
			if(getMode()!=='teleop'){ return; }
			var motor = planRobot.object.getObjectByName(this.value);
			if(!motor){return;}
			tcontrol.detach();
			tcontrol.attach(motor);
		});

		initBtn.addEventListener('click', function(){
			// bodyInit
			util.shm('/fsm/Body/init', true);
		});

		readyBtn.addEventListener('click', function(){
			// bodyInit
			util.shm('/fsm/Arm/ready', true);
		});

		resetBtn.addEventListener('click', function(){
			var reset_joints, reset_com, reset_step, reset_ik;
			switch(getMode()){
				case 'move':
					reset_com = true;
					break;
				case 'teleop':
					reset_joints = true;
					break;
				case 'step':
					reset_step = true;
					break;
				case 'ik':
					reset_ik = true;
					reset_joints = true;
					break;
				default:
					// Reset All
					reset_com = true;
					reset_joints = true;
					reset_step = true;
					reset_ik = true;
					break;
			}
			if(reset_joints){
				planRobot.meshes.forEach(function(m, i){
					m.quaternion.copy(this[i].cquaternion);
				}, robot.meshes);
			}
			if(reset_com){
				planRobot.object.position.copy(robot.object.position);
				planRobot.object.quaternion.copy(robot.object.quaternion);
			}
			if(reset_step){
				planRobot.foot.position.set(0,0,0);
				planRobot.foot.quaternion.copy(new THREE.Quaternion());
			}
			if(reset_ik){
				planRobot.rhand.position.set(0,0,0);
				planRobot.rhand.quaternion.copy(new THREE.Quaternion());
				planRobot.lhand.position.set(0,0,0);
				planRobot.lhand.quaternion.copy(new THREE.Quaternion());
			}
		});
		goBtn.addEventListener('click', function(){

			var qPlan = planRobot.meshes.map(function(m, i){
				var qDinv = this[i].clone().conjugate();
				var q0 = new THREE.Quaternion().multiplyQuaternions(qDinv, m.quaternion);
				var e = new THREE.Euler().setFromQuaternion(q0);
				return e.x;
			}, planRobot.qDefault);
			var qNow = robot.meshes.map(function(m, i){
				var qDinv = this[i].clone().conjugate();
				var q0 = new THREE.Quaternion().multiplyQuaternions(qDinv, m.quaternion);
				var e = new THREE.Euler().setFromQuaternion(q0);
				return e.x;
			}, robot.qDefault);

			var qHead = qPlan.slice(0, 2);
			var qHead0 = qNow.slice(0, 2);
			var sameHead = util.same(qHead, qHead0, 1e-2);
			//
			var qLArm = qPlan.slice(2, 9);
			var qLArm0 = qNow.slice(2, 9);
			var sameLArm = util.same(qLArm, qLArm0, 1e-2);
			//
			var qRArm = qPlan.slice(21, 28);
			var qRArm0 = qNow.slice(21, 28);
			var sameRArm = util.same(qRArm, qRArm0, 1e-2);
			//
			var qWaist = qPlan.slice(28, 30);
			var qWaist0 = qNow.slice(28, 30);
			var sameWaist = util.same(qWaist, qWaist0, 1e-2);
			//
			var lPlan = false, rPlan = false;
			var h_accept, h_decline, h_done;
			//var comWorldNow = robot.object.matrixWorld;
			var comWorldPlan = robot.object.matrixWorld;
			var invComWorldNow = new THREE.Matrix4().getInverse(robot.object.matrixWorld);
			var invComWorldPlan = new THREE.Matrix4().getInverse(planRobot.object.matrixWorld);

			switch(getMode()){
				case 'move':
					// Send the Waypoint
					var Tdiff = new THREE.Matrix4().multiplyMatrices(comWorldPlan, invComWorldNow);
					var dpL = new THREE.Vector3().setFromMatrixPosition(Tdiff);
					var daL = new THREE.Euler().setFromRotationMatrix(Tdiff);
					var relPose = [dpL.z/1e3, dpL.x/1e3, daL.y];
					var dpG = new THREE.Vector3().setFromMatrixPosition(planRobot.object.matrix);
					var daG = new THREE.Euler().setFromRotationMatrix(planRobot.object.matrix);
					var globalPose = [dpG.z/1e3, dpG.x/1e3, daG.y];
					util.debug([
						sprintf("Local WP: %0.2f %0.2f %0.2f",
										relPose[0], relPose[1], relPose[2]),
						sprintf("Global WP: %0.2f %0.2f %0.2f",
										globalPose[0], globalPose[1], globalPose[2]),
					]);
					util.shm('/shm/hcm/teleop/waypoint?fsm=Body&evt=approachbuggy', globalPose);
					break;
				case 'step':
					var p = planRobot.foot.position;
					var e = new THREE.Euler().setFromQuaternion(planRobot.foot.quaternion);
					var zpr = [p.y/1e3, e.x, e.z];
					var relpos = [p.z/1e3, p.x/1e3, e.y];
					var supportFoot, supportText;
					if(moveBtn.innerHTML==='Left'){
						supportText = 'Left';
						supportFoot = 1;
					} else {
						supportText = 'Right';
						supportFoot = 0;
					}
					util.debug([
						'Support: ' + supportText,
						sprintf("relpos: %0.2f %0.2f %0.2f",
										relpos[0], relpos[1], relpos[2]),
						sprintf("zpr: %0.2f %0.2f %0.2f",
										zpr[0], zpr[1]*util.RAD_TO_DEG, zpr[2]*util.RAD_TO_DEG),
					]);
					Promise.all([
						util.shm('/shm/hcm/step/relpos', relpos),
						util.shm('/shm/hcm/step/zpr', zpr),
						util.shm('/shm/hcm/step/supportLeg', [supportFoot]),
					]).then(function(){
						util.shm('/fsm/Body/stepover1', true);
					});
					break;
				case 'ik':
					if(this.innerHTML === 'Accept'){
						// We accepted a plan...
						this.innerHTML = 'Plan';
						return;
					}

					// Always with respect to our com position.
					var I16 = new THREE.Matrix4().elements;
					var sameLArmTF = util.same(planRobot.lhand.matrix.elements, I16);
					var sameRArmTF = util.same(planRobot.rhand.matrix.elements, I16);
					if(sameLArmTF && sameRArmTF){
						return;
					}

					//console.log('sameLArmTF', sameLArmTF);
					//console.log('sameRArmTF', sameRArmTF);
					// NOTE: Be careful between robots...
					var rhand_com = new THREE.Matrix4().multiplyMatrices(
						invComWorldPlan, planRobot.rhand.matrixWorld);
					var lhand_com = new THREE.Matrix4().multiplyMatrices(
						invComWorldPlan, planRobot.lhand.matrixWorld);
					var quatL = new THREE.Quaternion().setFromRotationMatrix(lhand_com);
					var quatR = new THREE.Quaternion().setFromRotationMatrix(rhand_com);
					var rpyL = new THREE.Euler().setFromQuaternion(quatL);
					var rpyR = new THREE.Euler().setFromQuaternion(quatR);
					var pL = new THREE.Vector3().setFromMatrixPosition(lhand_com);
					var pR = new THREE.Vector3().setFromMatrixPosition(rhand_com);
					util.debug([
						sprintf("Left: %0.2f %0.2f %0.2f | %0.2f %0.2f %0.2f",
										pL.z / 1e3, pL.x / 1e3, pL.y / 1e3,
										rpyL.z*RAD_TO_DEG, rpyL.x*RAD_TO_DEG, rpyL.y*RAD_TO_DEG),
						sprintf("Right: %0.2f %0.2f %0.2f | %0.2f %0.2f %0.2f",
										pR.z / 1e3, pR.x / 1e3, pR.y / 1e3,
										rpyR.z*RAD_TO_DEG, rpyR.x*RAD_TO_DEG, rpyR.y*RAD_TO_DEG),
					]);
					var tfL = [quatL.w, quatL.z, quatL.x, quatL.y, pL.z / 1e3, pL.x / 1e3, pL.y / 1e3];
					var tfR = [quatR.w, quatR.z, quatR.x, quatR.y, pR.z / 1e3, pR.x / 1e3, pR.y / 1e3];

					// Reset our position
					planRobot.rhand.position.set(0,0,0);
					planRobot.rhand.quaternion.copy(new THREE.Quaternion());
					planRobot.lhand.position.set(0,0,0);
					planRobot.lhand.quaternion.copy(new THREE.Quaternion());

					if(!sameLArmTF){
						lPlan = {
							tr: tfL,
							timeout: 30,
							via: 'jacobian_preplan',
							weights: [0,1,0,1],
							qLArm0: qLArm0,
							qArmGuess: sameLArm ? null : qLArm,
							qWaist0: qWaist0
						};
					}
					if(!sameRArmTF){
						rPlan = {
							tr: tfR,
							timeout: 30,
							via: 'jacobian_preplan',
							weights: [0,1,0,1],
							qRArm0: qRArm0,
							qArmGuess: sameRArm ? null : qRArm,
							qWaist0: qWaist0
						};
					}

					// Check if the waist moved:
					if(!sameWaist){
						//console.log('Not same waist!');
						// Use the planned waist as the final guess
						lPlan.qWaistGuess = rPlan.qWaistGuess = qWaist;
						// Check which moved. If both, then the current selection
						if(lPlan && rPlan){
							if(ikBtn.getAttribute('data-hand')==='L_WR_FT'){
								lPlan.via = 'jacobian_waist_preplan';
							} else {
								rPlan.via = 'jacobian_waist_preplan';
							}
						} else if (lPlan) {
							lPlan.via = 'jacobian_waist_preplan';
						} else {
							rPlan.via = 'jacobian_waist_preplan';
						}
					}

					this.innerHTML = 'Accept';
					console.log([lPlan, rPlan]);
					// TODO: Check if the planner failed
					util.shm('/armplan', [lPlan, rPlan])
					.then(procPlan)
					.then(function(plans){
						return plans.map(function(p){return p.length>0;});
					}).then(function(valid){
						return new Promise(function(resolve, reject) {
							var success = (sameLArmTF || valid[0]) && (sameRArmTF || valid[1]);
							if(!success){reject('Failed!');}
							// Go accepts and sends
							h_accept = goBtn.addEventListener('click', function(){
								resolve(valid);
							});
							// Step rejects
							h_decline = stepBtn.addEventListener('click', reject);
							// Done rejects
							h_done = ikBtn.addEventListener('click', reject);
						});
					}).then(function(valid){
						return Promise.all([
							valid[0] && util.shm('/shm/hcm/teleop/lweights', [1,1,0]),
							valid[1] && util.shm('/shm/hcm/teleop/rweights', [1,1,0]),
							valid[2] && util.shm('/shm/hcm/teleop/waist', qWaist)
						]);
					}).then(function(valid){
						// TODO: Grab a decision, via the promise
						return Promise.all([
							valid[0] && util.shm('/shm/hcm/teleop/tflarm', tfL),
							valid[1] && util.shm('/shm/hcm/teleop/tfrarm', tfR)
						]);
					}).catch(function(reason){
						util.debug([reason]);
						// Reset the arms
						planRobot.meshes.forEach(function(m, i){
							m.quaternion.copy(this[i].cquaternion);
						}, robot.meshes);
						console.log('Rejection of plan', reason);
					}).then(function(){
						goBtn.innerHTML = 'Plan';
						// Remove the listeners
						goBtn.removeEventListener('click', h_accept);
						stepBtn.removeEventListener('click', h_decline);
						ikBtn.removeEventListener('click', h_done);
					});
					break;
				case 'teleop':
					if(this.innerHTML === 'Accept'){
						// We accepted a plan...
						this.innerHTML = 'Plan';
						return;
					}

					if(sameLArm && sameRArm && sameWaist){
						return;
					}

					if(!sameLArm){
						lPlan = {
							q: qLArm,
							timeout: 30,
							via: 'joint_preplan',
							qLArm0: qLArm0,
							qWaist0: qWaist0
						};
					}
					if(!sameRArm){
						rPlan = {
							q: qRArm,
							timeout: 30,
							via: 'joint_preplan',
							qRArm0: qRArm0,
							qWaist0: qWaist0
						};
					}
					// Check if the waist moved:
					if(!sameWaist){
						//console.log('Not same waist!');
						// Use the planned waist as the final guess
						lPlan.qWaistGuess = rPlan.qWaistGuess = qWaist;
						// Check which moved. If both, then the current selection
						if(lPlan && rPlan){
							// Does not matter, so use the left
							lPlan.via = 'joint_waist_preplan';
						} else if (lPlan) {
							lPlan.via = 'joint_waist_preplan';
						} else {
							rPlan.via = 'joint_waist_preplan';
						}
					}

					this.innerHTML = 'Accept';
					// Send teleop
					util.shm('/armplan', [lPlan, rPlan])
					.then(procPlan)
					.then(function(plans){
						return plans.map(function(p){return p.length>0;});
					})
					.then(function(valid){
						return new Promise(function(resolve, reject) {
							var success = (sameLArm || valid[0]) && (sameRArm || valid[1]);
							if(!success){reject('Failed!');}
							// Go accepts and sends
							h_accept = goBtn.addEventListener('click', function(){
								resolve(valid);
							});
							// Step rejects
							h_decline = stepBtn.addEventListener('click', reject);
							// Done rejects
							h_done = ikBtn.addEventListener('click', reject);
						});
					})
					.then(function(){
						return sameWaist || util.shm('/shm/hcm/teleop/waist', qWaist);
					})
					.then(function(){
						// TODO: Grab a decision, via the promise
						return Promise.all([
							sameLArm || util.shm('/shm/hcm/teleop/larm', qLArm),
							sameRArm || util.shm('/shm/hcm/teleop/rarm', qRArm)
						]);
					}).then(function(){
						return sameHead || util.shm('/shm/hcm/teleop/head', qHead);
					}).catch(function(reason){
						util.debug([reason]);
						// Reset the arms
						planRobot.meshes.forEach(function(m, i){
							m.quaternion.copy(this[i].cquaternion);
						}, robot.meshes);
						console.log('Rejection of plan', reason);
					}).then(function(){
						goBtn.innerHTML = 'Plan';
						// Remove the listeners
						goBtn.removeEventListener('click', h_accept);
						stepBtn.removeEventListener('click', h_decline);
						ikBtn.removeEventListener('click', h_done);
					});
					break;
				default:
					// Proceed
					util.shm('/shm/hcm/state/proceed', [1]);
					break;
			}
		});

		moveBtn.addEventListener('click', function(){
			switch(getMode()){
				case 'step':
					var gfoot = planRobot.foot;
					var lfoot = planRobot.object.getObjectByName('L_FOOT');
					var rfoot = planRobot.object.getObjectByName('R_FOOT');
					lfoot.remove(gfoot);
					rfoot.remove(gfoot);
					if(this.innerHTML==='Right'){
						this.innerHTML = 'Left';
						rfoot.add(gfoot);
						stepBtn.setAttribute('data-foot', 'R_FOOT');
						gfoot.material.color.setHex(0xff0000);
					} else {
						this.innerHTML = 'Right';
						lfoot.add(gfoot);
						stepBtn.setAttribute('data-foot', 'L_FOOT');
						gfoot.material.color.setHex(0xffff00);
					}
					gfoot.position.set(0,0,0);
					gfoot.quaternion.copy(new THREE.Quaternion());
					return;
				case 'ik':
					// Switch hands
					tcontrol.detach();
					if(ikBtn.getAttribute('data-hand')==='L_WR_FT'){
						ikBtn.setAttribute('data-hand', 'R_WR_FT');
						tcontrol.attach(planRobot.rhand);
						moveBtn.innerHTML = 'Left';
					} else {
						ikBtn.setAttribute('data-hand', 'L_WR_FT');
						tcontrol.attach(planRobot.lhand);
						moveBtn.innerHTML = 'Right';
					}
					return;
				case 'teleop':
					// Reset just one
					var motor0 = robot.object.getObjectByName(jointSel.value);
					var motor = planRobot.object.getObjectByName(jointSel.value);
					motor.quaternion.copy(motor0.quaternion);
					return;
				case 'move':
					tcontrol.detach();
					tcontrol.enableY = true;
					resetLabels();
					return;
				default:
					this.innerHTML = 'Done';
					goBtn.innerHTML = 'Go';
					teleopBtn.innerHTML = 'Rotate';
					break;
			}

			//planRobot.object.visible = true;
			tcontrol.setMode('translate');
			tcontrol.space = 'local';
			tcontrol.enableX = true;
			tcontrol.enableY = false;
			tcontrol.enableZ = true;
			tcontrol.attach(planRobot.object);
		});

		stepBtn.addEventListener('click', function(){
			switch(getMode()){
				case 'move':
				case 'ik':
					if(goBtn.innerHTML === 'Accept'){
						// We accepted a plan...
						goBtn.innerHTML = 'Plan';
						return;
					}
					return;
				case 'teleop':
					if(goBtn.innerHTML === 'Accept'){
						// We accepted a plan...
						goBtn.innerHTML = 'Plan';
					}
					return;
				case 'step':
					tcontrol.detach();
					resetLabels();
					return;
				default:
					this.innerHTML = 'Done';
					goBtn.innerHTML = 'Go';
					teleopBtn.innerHTML = 'Rotate';
					break;
			}
			var gfoot = planRobot.foot;
			var lfoot = planRobot.object.getObjectByName('L_FOOT');
			var rfoot = planRobot.object.getObjectByName('R_FOOT');
			lfoot.remove(gfoot);
			rfoot.remove(gfoot);
			if(this.getAttribute('data-foot')==='L_FOOT'){
				lfoot.add(gfoot);
				this.setAttribute('data-foot', 'L_FOOT');
				moveBtn.innerHTML = 'Right';
			} else {
				rfoot.add(gfoot);
				this.setAttribute('data-foot', 'R_FOOT');
				moveBtn.innerHTML = 'Left';
			}
			//console.log(rfoot);
			tcontrol.detach();
			tcontrol.attach(gfoot);
			tcontrol.space = 'local';
			tcontrol.setMode('translate');
			tcontrol.enableX = true;
			tcontrol.enableY = true;
			tcontrol.enableZ = true;
		});

		ikBtn.addEventListener('click', function(){
			switch(getMode()){
				case 'move':
				case 'teleop':
				case 'teleop':
				case 'step':
					// These don't do anything...
					return;
				case 'ik':
					// In our mode, we just reset everything
					tcontrol.detach();
					resetLabels();
					return;
				default:
					// Enter a new control mode
					goBtn.innerHTML = 'Plan';
					stepBtn.innerHTML = 'Decline';
					this.innerHTML = 'Done';
					teleopBtn.innerHTML = 'Rotate';
					// Tell the robot to go into teleop mode
					util.shm('/fsm/Arm/teleop', true);
					break;
			}
			tcontrol.detach();
			if(this.getAttribute('data-hand')==='L_WR_FT'){
				tcontrol.attach(planRobot.lhand);
				this.setAttribute('data-hand', 'L_WR_FT');
				moveBtn.innerHTML = 'Right';
			} else {
				tcontrol.attach(planRobot.rhand);
				this.setAttribute('data-hand', 'R_WR_FT');
				moveBtn.innerHTML = 'Left';
			}
			tcontrol.space = 'local';
			tcontrol.setMode('translate');
			tcontrol.enableX = true;
			tcontrol.enableY = true;
			tcontrol.enableZ = true;
		});

		teleopBtn.addEventListener('click', function(){
			switch(getMode()){
				case 'move':
					// Switches between rotate/translate
					if(this.innerHTML==='Rotate'){
						tcontrol.setMode('rotate');
						tcontrol.enableX = false;
						tcontrol.enableY = true;
						tcontrol.enableZ = false;
						this.innerHTML = 'Translate';
					} else if(this.innerHTML === 'Translate') {
						tcontrol.setMode('translate');
						tcontrol.enableX = true;
						tcontrol.enableY = false;
						tcontrol.enableZ = true;
						this.innerHTML = 'Rotate';
					}
					return;
				case 'ik':
				case 'step':
					// Switches between rotate/translate
					if(this.innerHTML==='Rotate'){
						tcontrol.setMode('rotate');
						this.innerHTML = 'Translate';
					} else if(this.innerHTML==='Translate') {
						tcontrol.setMode('translate');
						this.innerHTML = 'Rotate';
					}
					return;
				case 'teleop':
					// In our mode, we just reset everything
					tcontrol.detach();
					tcontrol.enableY = true;
					tcontrol.enableZ = true;
					tcontrol.enableXYZE = true;
					tcontrol.enableE = true;
					resetLabels();
					return;
				default:
					// Enter a new control mode
					this.innerHTML = 'Done';
					stepBtn.innerHTML = 'Decline';
					goBtn.innerHTML = 'Plan';
					moveBtn.innerHTML = 'Undo';
					ikBtn.innerHTML = '_';
					// Tell the robot to go into teleop
					util.shm('/fsm/Head/teleop', true);
					util.shm('/fsm/Arm/teleopraw', true);
					break;
			}
			var motor = planRobot.object.getObjectByName(jointSel.value);
			if (motor) {
				tcontrol.setMode('rotate');
				tcontrol.space = 'local';
				tcontrol.enableY = false;
				tcontrol.enableZ = false;
				tcontrol.enableXYZE = false;
				tcontrol.enableE = false;
				tcontrol.attach(motor);
			}
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
		camera.position.copy(new THREE.Vector3(500, 1500, -500));
		// Load in the Orbit controls dynamically
		controls = new THREE.OrbitControls(camera, container);
		controls.target = new THREE.Vector3(0, 0, 1000);
		tcontrol = new THREE.TransformControls( camera, renderer.domElement );
		scene.add(tcontrol);
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
	} //done 3d

	function setup_rtc(){
		var peer_id = 'all_scene';
		var peer = new Peer(peer_id, {host: 'localhost', port: 9000});
		peer.on('open', function(id) {
			console.log('My peer ID is: ' + id);
		});
		peer.on('disconnected', function(conn) { console.log('disconnected', conn); });
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

	function setup_robot(port){
		// Load the robot
		robot = new ctx.Robot({
			port: port,
			name: 'dale',
			callback: function(){
				scene.add(this);
				planRobot = new ctx.Robot({
					name: 'dale',
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
						//planRobot.object.visible = false;
						// Joint teleop
						var sel = document.getElementById('joints');
						planRobot.meshes.forEach(function(m){
							if(!m.name){return;}
							var x = document.createElement("OPTION");
							x.value = m.name;
							x.innerHTML = m.name;
							sel.appendChild(x);
						});
						planRobot.object.getObjectByName('L_FOOT').add(planRobot.foot);
						planRobot.object.getObjectByName('L_WR_FT').add(planRobot.lhand);
						planRobot.object.getObjectByName('R_WR_FT').add(planRobot.rhand);
						/*
						planRobot.object.add(planRobot.lhand);
						planRobot.object.add(planRobot.rhand);
						*/
						scene.add(this);
					}
				});
			}
		});
	}

	// Constantly animate the scene
	function animate() {
		if (controls) { controls.update(); }
		if (tcontrol) { tcontrol.update(); }
		renderer.render(scene, camera);
		window.requestAnimationFrame(animate);
	}

	// Load everything
	Promise.all([
		util.lcss('/css/all_scene.css'),
		util.lcss('/css/gh-buttons.css'),
		util.ljs('/Estimate.js'),
		util.ljs('/Classify.js'),
		util.ljs("/VideoFeed.js"),
		util.ljs('/bc/threejs/build/three.js')
	]).then(function(){
		return Promise.all([
			util.ljs("/MeshFeed.js"),
			util.ljs("/KinectFeed.js"),
			util.ljs('/OrbitControls.js'),
			util.ljs('/TransformControls.js'),
			util.ljs('/Robot.js'),
		]);
	}).then(function(){
		return util.lhtml('/view/all_scene.html');
	}).then(function(view){
		document.body = view;
		container = document.getElementById('world_container');
		return Promise.all([
			util.shm('/streams/mesh0'),
			util.shm('/streams/mesh1'),
			util.shm('/streams/kinect2_color'),
			util.shm('/streams/kinect2_depth')
		]);
	}).then(function(ports){
		mesh0_feed = new MeshFeed(ports[0], process_mesh);
		mesh1_feed = new MeshFeed(ports[1], process_mesh);
		kinect_feed = new ctx.KinectFeed(ports[2], ports[3], process_mesh);
	})
		.then(setup3d)
		.then(setup_rtc)
		.then(setup_buttons)
		.then(setup_clicks)
	.then(function(){
		return util.shm('/streams/feedback');
	}).then(setup_robot);

}(this));
