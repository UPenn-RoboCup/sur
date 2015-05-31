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
		N_MESH0 = 2, N_MESH1 = 2, N_KINECT = 1,
		map_peers = [],
		last_intersection = {t:0}, last_selected_parameters = null,
		pillars = [],
			listener,
		//resetBtn, proceedBtn,
			//teleopBtn, ikBtn, moveBtn,
			//acceptBtn, declineBtn, stepBtn,
		jointSel, mesh0Sel, mesh1Sel, allBtns, shmBtns,
		control_mode;

	// State variables
	var qPlan, qNow, qHead, qHead0, sameHead,
qLArm, qLArm0, sameLArm, qRArm, qRArm0, sameRArm,
qWaist, qWaist0, sameWaist,
sameLArmTF, sameRArmTF,
comWorldPlan, invComWorldNow, invComWorldPlan; //comWorldNow

	function calculate_state(){
		qPlan = planRobot.meshes.map(function(m, i){
			var qDinv = this[i].clone().conjugate();
			var q0 = new THREE.Quaternion().multiplyQuaternions(qDinv, m.quaternion);
			var e = new THREE.Euler().setFromQuaternion(q0);
			return e.x;
		}, planRobot.qDefault);
		qNow = robot.meshes.map(function(m, i){
			var qDinv = this[i].clone().conjugate();
			var q0 = new THREE.Quaternion().multiplyQuaternions(qDinv, m.quaternion);
			var e = new THREE.Euler().setFromQuaternion(q0);
			return e.x;
		}, robot.qDefault);

		qHead = qPlan.slice(0, 2);
		qHead0 = qNow.slice(0, 2);
		sameHead = util.same(qHead, qHead0, 1e-2);
		//
		qLArm = qPlan.slice(2, 9);
		qLArm0 = qNow.slice(2, 9);
		sameLArm = util.same(qLArm, qLArm0, 1e-2);
		//
		qRArm = qPlan.slice(21, 28);
		qRArm0 = qNow.slice(21, 28);
		sameRArm = util.same(qRArm, qRArm0, 1e-2);
		//
		qWaist = qPlan.slice(28, 30);
		qWaist0 = qNow.slice(28, 30);
		sameWaist = util.same(qWaist, qWaist0, 1e-2);
		//
		var I16 = new THREE.Matrix4().elements;
		sameLArmTF = util.same(planRobot.lhand.matrix.elements, I16);
		sameRArmTF = util.same(planRobot.rhand.matrix.elements, I16);
		//
		//var comWorldNow = robot.object.matrixWorld;
		comWorldPlan = planRobot.object.matrixWorld;
		invComWorldNow = new THREE.Matrix4().getInverse(robot.object.matrixWorld);
		invComWorldPlan = new THREE.Matrix4().getInverse(planRobot.object.matrixWorld);
	}

	function procPlan(plan) {
		return new Promise(function(resolve, reject) {
			if(!plan){reject();}
			var lplan = plan[0].length ? plan[0] : false;
			var rplan = plan[1].length ? plan[1] : false;
			var wplan = plan[2].length ? plan[2] : false;
			if(!lplan && !rplan && !wplan){reject();}
			resolve([lplan, rplan, wplan]);
		});
	}

	function playPlan(paths) {
		var true_hz = 120, subsample = 0.5, half_sec = Math.floor(true_hz * subsample),
				speedup = 4, play_rate = Math.floor(1e3 * subsample / speedup);
		// Guarantees 2 points
		function halfsec(v, i, arr) {
			return (i % half_sec)===0 || i===arr.length;
		}
		function updatechain(frame){
			var chain_ids = this;
			frame[1].forEach(function(v, i){
				planRobot.setJoints(v, chain_ids[i]);
			});
		}

		var promises = [];
		//console.log(paths);
		if(paths[0]){
			promises.push(
				util.loop(paths[0].filter(halfsec), updatechain.bind(planRobot.IDS_LARM), play_rate));
		} else {
			promises.push(false);
		}
		if(paths[1]){
			promises.push(
				util.loop(paths[1].filter(halfsec), updatechain.bind(planRobot.IDS_RARM), play_rate));
		} else {
			promises.push(false);
		}
		if(paths[2]){
			promises.push(
				util.loop(paths[2].filter(halfsec), updatechain.bind(planRobot.IDS_WAIST), play_rate));
		} else {
			promises.push(false);
		}

		// TODO: catch on bad plan or user cancel
		var prAll = Promise.all(promises);
		prAll.stop = function(){
			promises.forEach(function(pr){
				if(pr && pr.h){pr.stop();}
			});
			return paths;
		};
		return prAll;
	}

	function reset_hands(){
		if(tcontrol.object===planRobot.lhand){
			var lhandPlan = planRobot.object.getObjectByName('L_TIP');
			var lhandNow = robot.object.getObjectByName('L_TIP');
			//var invLHandPlan = new THREE.Matrix4().getInverse(lhandPlan.matrixWorld);
			var invLHandNow = new THREE.Matrix4().getInverse(lhandNow.matrixWorld);
			var TdiffL1 = new THREE.Matrix4().multiplyMatrices(invLHandNow, lhandPlan.matrixWorld);
			var TdiffL = new THREE.Matrix4().getInverse(TdiffL1);
			//var TdiffL = new THREE.Matrix4().multiplyMatrices(lhandNow.matrixWorld, invLHandPlan);
			var dpL = new THREE.Vector3().setFromMatrixPosition(TdiffL);
			var daL = new THREE.Quaternion().setFromRotationMatrix(TdiffL);
			planRobot.lhand.position.copy(dpL);
			planRobot.lhand.quaternion.copy(daL);
		} else {
			var rhandPlan = planRobot.object.getObjectByName('R_TIP');
			var rhandNow = robot.object.getObjectByName('R_TIP');
			//var invRHandPlan = new THREE.Matrix4().getInverse(rhandPlan.matrixWorld);
			var invRHandNow = new THREE.Matrix4().getInverse(rhandNow.matrixWorld);
			var TdiffR1 = new THREE.Matrix4().multiplyMatrices(invRHandNow, rhandPlan.matrixWorld);
			var TdiffR = new THREE.Matrix4().getInverse(TdiffR1);
			//var TdiffL = new THREE.Matrix4().multiplyMatrices(rhandNow.matrixWorld, invRHandPlan);
			var dpR = new THREE.Vector3().setFromMatrixPosition(TdiffR);
			var daR = new THREE.Quaternion().setFromRotationMatrix(TdiffR);
			planRobot.rhand.position.copy(dpR);
			planRobot.rhand.quaternion.copy(daR);
		}
	}

	function select_joint(){
		if(control_mode!=='teleopraw'){return;}
		var motor = planRobot.object.getObjectByName(jointSel.value);
		var idx = jointSel.selectedIndex;
		if(!motor || idx===-1){return;}
		tcontrol.detach();
		tcontrol.attach(motor);
		tcontrol.setMode('rotate');
		tcontrol.space = 'local';
		tcontrol.enableX = true;
		tcontrol.enableY = false;
		tcontrol.enableZ = false;
		tcontrol.enableE = false;
		tcontrol.enableXYZE = false;
		calculate_state();
		var q0 = qNow[idx];
		var q = qPlan[idx];
		util.debug([
			((q0*util.RAD_TO_DEG).toPrecision(4)) + ' deg now',
			((q*util.RAD_TO_DEG).toPrecision(4)) + ' deg planned'
		]);
		return motor;
	}

	function click_joint(){
		control_mode = 'teleopraw';
		util.shm('/fsm/Arm/teleopraw');
		select_joint();
	}

	function click_ik(){
		control_mode='ik';
		util.shm('/fsm/Arm/teleop');
		tcontrol.detach();
		tcontrol.space = 'local';
		tcontrol.setMode('translate');
		tcontrol.enableX = true;
		tcontrol.enableY = true;
		tcontrol.enableZ = true;
		tcontrol.enableXYZE = false;
		tcontrol.attach(planRobot.lhand);
	}

	function click_move(){
		control_mode='move';
		tcontrol.detach();
		tcontrol.attach(planRobot.object);
		/*
		tcontrol.setMode('translate');
		tcontrol.space = 'local';
		tcontrol.enableX = true;
		tcontrol.enableY = false;
		tcontrol.enableZ = true;
		tcontrol.detach();
		tcontrol.attach(planRobot.object);
		*/
	}

	function plan_arm(plan){
		var success = true;
		//var h_accept, h_decline;
		var escDecline, spaceAccept;
		util.debug(['Planning...']);
		return util.shm('/armplan', plan || this)
		.then(procPlan)
		.then(function(paths){
			util.debug(['Done planning.']);
			var prPlay = playPlan(paths);
			prPlay.then(function(){
				//console.log('Finished playing');
				// TODO: Add the tconrol here
			}, function(){
				//console.log('Interrupted playing');
			}).then(function(){
				//
			});
			var prAccept = new Promise(function(resolve) {
				/*
				h_accept = proceedBtn.addEventListener('click', function(e){
					e.stopPropagation();
					resolve();
				});
				*/
				spaceAccept = listener.simple_combo('space', resolve);
			});
			var prDecline = new Promise(function(resolve, reject) {
				/*
				h_decline = resetBtn.addEventListener('click', function(e){
					e.stopPropagation();
					reject();
				});
				*/
				escDecline = listener.simple_combo('escape', reject);
			});
			return Promise.race([prAccept, prDecline]).catch(function(){
				// Rejection goes here
				// Reset the arms
				planRobot.meshes.forEach(function(m, i){
					m.quaternion.copy(robot.meshes[i].quaternion);
				});
				success = false;
			}).then(function(){
				//proceedBtn.removeEventListener('click', h_accept);
				//proceedBtn.removeEventListener('click', h_decline);
				listener.unregister_many([escDecline, spaceAccept]);
				var paths = prPlay.stop();
				return success ? paths : false;
			});
		});
	}

	function go_ik() {

		// Always with respect to our com position.
		if(sameLArmTF && sameRArmTF){ return; }

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

		var lPlan, rPlan;
		if(!sameLArmTF){
			lPlan = {
				tr: tfL,
				timeout: 30,
				via: 'jacobian_preplan',
				weights: [0,1,0,1],
				qLArm0: qLArm0,
				qWaist0: qWaist0,
				qArmGuess: sameLArm ? null : qLArm
			};
		}
		if(!sameRArmTF){
			rPlan = {
				tr: tfR,
				timeout: 30,
				via: 'jacobian_preplan',
				weights: [0,1,0,1],
				qRArm0: qRArm0,
				qWaist0: qWaist0,
				qArmGuess: sameRArm ? null : qRArm
			};
		}

		// Check if the waist moved:
		if(!sameWaist){
			//console.log('Not same waist!');
			// Use the planned waist as the final guess
			if (lPlan) {lPlan.qWaistGuess = qWaist;}
			if (rPlan) {rPlan.qWaistGuess = qWaist;}
			// Check which moved. If both, then the current selection
			if(lPlan && rPlan){
				if(tcontrol.object===planRobot.lhand){
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

		return plan_arm({left: lPlan, right: rPlan}).then(function(paths){
			console.log('Sending IK', paths);
			control_mode = 'ik';
			if(!paths){return;}
			// TODO: Set the final arm configs
			return Promise.all([
				paths[0] ? util.shm('/shm/hcm/teleop/lweights', [1,1,0]) : false,
				paths[1] ? util.shm('/shm/hcm/teleop/rweights', [1,1,0]) : false,
				paths[2] ? util.shm('/shm/hcm/teleop/waist', qWaist) : false,
				paths[0] ? util.shm('/shm/hcm/teleop/tflarm', lPlan.tr) : false,
				paths[1] ? util.shm('/shm/hcm/teleop/tfrarm', rPlan.tr) : false
			]);
		});
	}

	function go_teleopraw(){

		if(!sameHead){util.shm('/shm/hcm/teleop/head', qHead);}

		if(sameLArm && sameRArm && sameWaist){ return; }

		var lPlan = false, rPlan = false;
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
			if(lPlan) {lPlan.qWaistGuess = qWaist;}
			if(rPlan) {rPlan.qWaistGuess = qWaist;}
			// Check which moved. If both, then the current selection
			if(lPlan && rPlan){
				// Does not matter, so use the left
				lPlan.via = 'joint_waist_preplan';
			} else if (lPlan) {
				lPlan.via = 'joint_waist_preplan';
			} else if (rPlan) {
				rPlan.via = 'joint_waist_preplan';
			} else {
				console.log('Did not implement waist only joint level');
			}
		}
/*
		return plan_arm({left: lPlan, right: rPlan}).then(function(paths){
			console.log('Sending Q', paths);
			if(!paths){return;}
			return Promise.all([
				sameWaist ? true : util.shm('/shm/hcm/teleop/waist', qWaist),
				sameLArm ? true : util.shm('/shm/hcm/teleop/larm', qLArm),
				sameRArm ? true : util.shm('/shm/hcm/teleop/rarm', qRArm)
			]);
		});
*/
		return Promise.all([
			sameWaist ? true : util.shm('/shm/hcm/teleop/waist', qWaist),
			sameLArm ? true : util.shm('/shm/hcm/teleop/larm', qLArm),
			sameRArm ? true : util.shm('/shm/hcm/teleop/rarm', qRArm)
		]);
	}

	function go_move(){
		var Tdiff = new THREE.Matrix4().multiplyMatrices(invComWorldNow, comWorldPlan);//
		var dpL = new THREE.Vector3().setFromMatrixPosition(Tdiff);
		var daL = new THREE.Euler().setFromRotationMatrix(Tdiff);
		//
		var dpG = new THREE.Vector3().setFromMatrixPosition(planRobot.object.matrix);
		var daG = new THREE.Euler().setFromRotationMatrix(planRobot.object.matrix);
		//
		var relPose = [dpL.z/1e3, dpL.x/1e3, daL.y];
		var globalPose = [dpG.z/1e3, dpG.x/1e3, daG.y];
		util.debug([
			sprintf("Local WP: %0.2f %0.2f %0.2f",
							relPose[0], relPose[1], relPose[2]),
			sprintf("Global WP: %0.2f %0.2f %0.2f",
							globalPose[0], globalPose[1], globalPose[2]),
		]);
		//util.shm('/shm/hcm/teleop/waypoint?fsm=Body&evt=approachbuggy', globalPose);
		if (Math.abs(relPose[0])<=0.1 && Math.abs(relPose[1])<=0.1 && Math.abs(relPose[2])<=10*util.DEG_TO_RAD){
			return util.shm('/shm/hcm/teleop/waypoint?fsm=Body&evt=stepflat', relPose);
		} else {
			return util.shm('/shm/hcm/teleop/waypoint?fsm=Body&evt=approach', relPose);
		}

	}
/*
	function go_step(){
		var p = planRobot.foot.position;
		var e = new THREE.Euler().setFromQuaternion(planRobot.foot.quaternion);
		var zpr = [p.y/1e3, e.x, e.z];
		var relpos = [p.z/1e3, p.x/1e3, e.y];
		var supportFoot = moveBtn.innerHTML==='Left' ? 1 : 0;
		util.debug([
			'Support: ' + moveBtn.innerHTML,
			sprintf("relpos: %0.2f %0.2f %0.2f",
							relpos[0], relpos[1], relpos[2]),
			sprintf("zpr: %0.2f %0.2f %0.2f",
							zpr[0], zpr[1]*util.RAD_TO_DEG, zpr[2]*util.RAD_TO_DEG),
		]);
		return Promise.all([
			util.shm('/shm/hcm/step/relpos', relpos),
			util.shm('/shm/hcm/step/zpr', zpr),
			util.shm('/shm/hcm/step/supportLeg', [supportFoot]),
		]).then(function(){
			util.shm('/fsm/Body/stepover1');
		});
	}
*/
	var go_promises = {
		move: go_move,
		//step: go_step,
		ik: go_ik,
		teleopraw: go_teleopraw,
	};

	function click_proceed(){
		var f = go_promises[control_mode];
		calculate_state();
		if(typeof f==='function'){
			return f();
		} else {
			util.shm('/shm/hcm/state/proceed', [1]);
		}

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

	function process_mesh(mesh_obj) {
		// Adds THREE buffer geometry from triangulated mesh to the scene
		var geometry = new THREE.BufferGeometry(),
			material = new THREE.MeshLambertMaterial({
			//material = new THREE.MeshPhongMaterial({
      //material = new THREE.MeshBasicMaterial({
				side: THREE.DoubleSide,
				// Fill the color channels with the colors attribute through the vertex shader
        // Enable all color channels. Super important for vertex colors!
				//color: 0xFFFFFF,
				color: 0xAAAAAA,
        vertexColors: THREE.VertexColors,
        // TODO: Check the extra Phong parameters
        ambient: 0xaaaaaa, specular: 0x000,
				transparent: true,
				opacity: 0.75
				//shininess: 5,
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
		//geometry.computeBoundingSphere();
    //geometry.computeBoundingBox();
		// Phong Material requires normals for reflectivity
    // TODO: Perform the normals computation in the Worker thread maybe?
		geometry.computeVertexNormals();
		var mesh = new THREE.Mesh(geometry, material);
    mesh.name = mesh_obj.id;
    mesh.n_el = mesh_obj.n_el;

		// Save a set of meshes
		if(mesh.name==='mesh0'){
			var mesh0add = document.querySelector('input#mesh0sel').checked;
			if(mesh0add){scene.add(mesh);}
			mesh0.push(mesh);
			while(mesh0.length > N_MESH0){
				var old0 = mesh0.shift();
				scene.remove(old0);
				old0.geometry.dispose();
				old0.geometry = null;
				old0.material.dispose();
				old0.material = null;
				old0 = null;
			}
		} else if(mesh.name==='mesh1'){
			var mesh1add = document.querySelector('input#mesh1sel').checked;
			if(mesh1add){scene.add(mesh);}
			mesh1.push(mesh);
			while(mesh1.length > N_MESH1){
				var old1 = mesh1.shift();
				scene.remove(old1);
				old1.geometry.dispose();
				old1.geometry = null;
				old1.material.dispose();
				old1.material = null;
				old1 = null;
			}
		} else if(mesh.name==='kinect'){
			kinect.push(mesh);
			if(kinect.length > N_KINECT){ scene.remove(kinect.shift()); }
		}
	}

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
			//console.log(obj);
			// Save the intersection for a mouseup refocus
			last_intersection.p = p;
			last_intersection.mesh = mesh;
			last_intersection.t = e.timeStamp;
			// Solve for the transform from the robot frame to the point
			var T_point = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z),
				T_inv = new THREE.Matrix4().getInverse(robot.object.matrix),
				T_offset = new THREE.Matrix4().multiplyMatrices(T_inv, T_point);
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
					sprintf("%0.2f %0.2f %0.2f", offset_msg[2], offset_msg[0], global_msg[1]),
				]);

				switch(control_mode){
					case 'ik':
						if(tcontrol.object===planRobot.lhand){
							var lhandPlan = planRobot.object.getObjectByName('L_TIP');
							var invLHandPlan = new THREE.Matrix4().getInverse(lhandPlan.matrixWorld);
							var TdiffL = new THREE.Matrix4().multiplyMatrices(invLHandPlan, T_point);
							planRobot.lhand.position.setFromMatrixPosition(TdiffL);
							//planRobot.lhand.quaternion.setFromRotationMatrix(TdiffL);
						} else {
							var rhandPlan = planRobot.object.getObjectByName('R_TIP');
							var invRHandPlan = new THREE.Matrix4().getInverse(rhandPlan.matrixWorld);
							var TdiffR = new THREE.Matrix4().multiplyMatrices(invRHandPlan, T_point);
							planRobot.rhand.position.setFromMatrixPosition(TdiffR);
							//planRobot.lhand.quaternion.setFromRotationMatrix(TdiffR);
						}
						break;
					case 'move':
						planRobot.object.position.set(p.x, planRobot.object.position.y, p.z);
						break;
					default:
						break;
				}
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
		function handleRightClick (e){
				console.log(this, e);
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
						params.mesh.geometry.dispose();
						params.mesh.geometry = null;
						params.mesh.material.dispose();
						params.mesh.material = null;
						params.mesh = null;
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
			}

		var allRightClicks = document.querySelectorAll('#topic2 li');
		for(var i = 0; i<allRightClicks.length; i+=1){
			var menu = allRightClicks.item(i);
			menu.addEventListener('click', handleRightClick);
		}

	}

	function delta_walk(){
		if(control_mode!=='move'){ return; }
		var mat = planRobot.object.matrix.multiply(this);
		planRobot.object.position.setFromMatrixPosition(mat);
		planRobot.object.quaternion.setFromRotationMatrix(mat);
	}
	function delta_hand(){
		if(control_mode!=='ik'){ return; }
		var hand;
		if(tcontrol.object===planRobot.lhand){
			hand = planRobot.lhand;
		} else {
			hand = planRobot.rhand;
		}
		var mat = hand.matrix.multiply(this);
		hand.position.setFromMatrixPosition(mat);
		hand.quaternion.setFromRotationMatrix(mat);
	}
	function delta_head() {
		var neck = planRobot.object.getObjectByName('Neck');
		var head = planRobot.object.getObjectByName('Head');
		var matNeck = neck.matrix.multiply(this[0]);
		var matHead = head.matrix.multiply(this[1]);
		head.quaternion.setFromRotationMatrix(matHead);
		neck.quaternion.setFromRotationMatrix(matNeck);
		calculate_state();
		return util.shm('/shm/hcm/teleop/head', qHead);
	}

	function setup_keys(){
		listener = new keypress.Listener();
		// Walk keys
		listener.simple_combo("i", delta_walk.bind(
			new THREE.Matrix4().makeTranslation(0,0,25)));
		listener.simple_combo(",", delta_walk.bind(
			new THREE.Matrix4().makeTranslation(0,0,-25)));
		listener.simple_combo("h", delta_walk.bind(
			new THREE.Matrix4().makeTranslation(25,0,0)));
		listener.simple_combo(";", delta_walk.bind(
			new THREE.Matrix4().makeTranslation(-25,0,0)));
		listener.simple_combo("j", delta_walk.bind(
			new THREE.Matrix4().makeRotationY(2.5*util.DEG_TO_RAD)));
		listener.simple_combo("l", delta_walk.bind(
			new THREE.Matrix4().makeRotationY(-2.5*util.DEG_TO_RAD)));
		listener.simple_combo("k", function(){
			planRobot.object.position.copy(robot.object.position);
			planRobot.object.quaternion.copy(robot.object.quaternion);
		});
		// Control the hand
		listener.simple_combo("i", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(0,0,10)));
		listener.simple_combo(",", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(0,0,-10)));
		listener.simple_combo("h", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(10,0,0)));
		listener.simple_combo(";", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(-10,0,0)));
		listener.simple_combo("u", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(0,10,0)));
		listener.simple_combo("m", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(0,-10,0)));
		listener.simple_combo("j", delta_hand.bind(
			new THREE.Matrix4().makeRotationY(2.5*util.DEG_TO_RAD)));
		listener.simple_combo("l", delta_hand.bind(
			new THREE.Matrix4().makeRotationY(-2.5*util.DEG_TO_RAD)));
		listener.simple_combo("y", delta_hand.bind(
			new THREE.Matrix4().makeRotationX(2.5*util.DEG_TO_RAD)));
		listener.simple_combo("n", delta_hand.bind(
			new THREE.Matrix4().makeRotationX(-2.5*util.DEG_TO_RAD)));
		listener.simple_combo("/", delta_hand.bind(
			new THREE.Matrix4().makeRotationZ(2.5*util.DEG_TO_RAD)));
		listener.simple_combo(".", delta_hand.bind(
			new THREE.Matrix4().makeRotationZ(-2.5*util.DEG_TO_RAD)));
		listener.simple_combo("k", reset_hands);
		// Control the head
		listener.simple_combo("w", delta_head.bind([
			new THREE.Matrix4(),
			new THREE.Matrix4().makeRotationX(-2.5*util.DEG_TO_RAD)
		]));
		listener.simple_combo("a", delta_head.bind([
			new THREE.Matrix4().makeRotationX(2.5*util.DEG_TO_RAD),
			new THREE.Matrix4()
		]));
		listener.simple_combo("s", delta_head.bind([
			new THREE.Matrix4(),
			new THREE.Matrix4().makeRotationX(2.5*util.DEG_TO_RAD)
		]));
		listener.simple_combo("d", delta_head.bind([
			new THREE.Matrix4().makeRotationX(-2.5*util.DEG_TO_RAD),
			new THREE.Matrix4()
		]));
		listener.simple_combo("shift k", function(){
			return util.shm('/fsm/Head/teleop', qHead);
		});
		// +/- the raw joints
		listener.simple_combo("]", function(){
			jointSel.selectedIndex += 1;
			select_joint();
		});
		listener.simple_combo("[", function(){
			jointSel.selectedIndex -= 1;
			select_joint();
		});
		listener.simple_combo("=", function(){
			if(control_mode!=='teleopraw'){return;}
			var motor = planRobot.object.getObjectByName(jointSel.value);
			var idx = jointSel.selectedIndex;
			if(!motor || idx===-1){return;}
			var rot = new THREE.Matrix4().makeRotationX(-5*util.DEG_TO_RAD);
			var mat = motor.matrix.multiply(rot);
			motor.quaternion.setFromRotationMatrix(mat);
			calculate_state();
			var q0 = qNow[idx];
			var q = qPlan[idx];
			util.debug([
				((q0*util.RAD_TO_DEG).toPrecision(4)) + ' deg now',
				((q*util.RAD_TO_DEG).toPrecision(4)) + ' deg planned'
			]);
		});
		listener.simple_combo("-", function(){
			if(control_mode!=='teleopraw'){return;}
			var motor = planRobot.object.getObjectByName(jointSel.value);
			var idx = jointSel.selectedIndex;
			if(!motor || idx===-1){return;}
			var rot = new THREE.Matrix4().makeRotationX(5*util.DEG_TO_RAD);
			var mat = motor.matrix.multiply(rot);
			motor.quaternion.setFromRotationMatrix(mat);
			calculate_state();
			var q0 = qNow[idx];
			var q = qPlan[idx];
			util.debug([
				((q0*util.RAD_TO_DEG).toPrecision(4)) + ' deg now',
				((q*util.RAD_TO_DEG).toPrecision(4)) + ' deg planned'
			]);
		});

		// Switch hands
		listener.simple_combo("'", function(){
			// Switch hands
			if(tcontrol.object===planRobot.rhand){
				tcontrol.detach();
				tcontrol.attach(planRobot.lhand);
			} else {
				tcontrol.detach();
				tcontrol.attach(planRobot.rhand);
			}
		});

		listener.register_combo({
			sequence_delay: 100
		});
		listener.simple_combo("space", click_proceed);
		listener.simple_combo("escape", function(){
			control_mode = '';
			tcontrol.detach();
			planRobot.meshes.forEach(function(m, i){
				m.quaternion.copy(robot.meshes[i].quaternion);
			});
			planRobot.object.position.copy(robot.object.position);
			planRobot.object.quaternion.copy(robot.object.quaternion);
			//planRobot.foot.position.set(0,0,0);
			//planRobot.foot.quaternion.copy(new THREE.Quaternion());
			planRobot.lhand.position.set(0,0,0);
			planRobot.lhand.quaternion.copy(new THREE.Quaternion());
			planRobot.rhand.position.set(0,0,0);
			planRobot.rhand.quaternion.copy(new THREE.Quaternion());
		});
		listener.simple_combo("backspace", function(){
			console.log('!body stop!');
			return util.shm('/fsm/Body/stop');
		});
		//
		listener.simple_combo("!", function(){
			console.log('body init');
			return util.shm('/fsm/Body/init');
		});
		listener.simple_combo("1", function(){
			control_mode = 'arminit';
			return util.shm('/fsm/Arm/init');
		});
		listener.simple_combo("2", function(){
			return try_arm_fsm('ready');
		});
		listener.simple_combo("3", function(){
			return try_arm_fsm('pushdoor');
		});
		listener.simple_combo("4", function(){
			return try_arm_fsm('valve');
		});
		listener.simple_combo("5", function(){
			return try_arm_fsm('drill');
		});
		listener.simple_combo("6", function(){
			return try_arm_fsm('shower');
		});
		listener.simple_combo("0", click_ik);
		listener.simple_combo("9", click_move);
		listener.simple_combo("`", click_joint);
	}

	function try_arm_fsm(name){
		control_mode = 'armplan';
		var evt = '/fsm/Arm/' + name;
		return util.shm('/c', ['arm', name]).then(preview_sequence).then(function(paths){
			if(!paths) { return; }
			return util.shm(evt);
		}).catch(function(reason){
			console.log('nope', reason);
		}).then(function(){
			control_mode = '';
		});
	}

	function show_qarms(paths){
//		console.log('paths', paths);
		calculate_state();
		var qlmsg = qLArm.map(function(q){
			return (q*util.RAD_TO_DEG).toPrecision(4);
		}).join(', ');
		var qrmsg = qRArm.map(function(q){
			return (q*util.RAD_TO_DEG).toPrecision(4);
		}).join(', ');
		var path_msg = paths ? paths.map(function(p){return p ? 'OK': '(/)';}) : "nope";
		util.debug([qlmsg, qrmsg, path_msg]);
		return paths;
	}

	function preview_sequence(seq){
		if(!seq){return false;}
		calculate_state();
		var i = 0;
		var cfgPlan = seq[i];
		if(cfgPlan.left){ cfgPlan.left.qLArm0 = qLArm; }
		if(cfgPlan.right){ cfgPlan.right.qRArm0 = qRArm; }
		var prCfgPlan = plan_arm(cfgPlan).then(show_qarms);
		while(cfgPlan) {
			i += 1;
			cfgPlan = seq[i];
			if(cfgPlan){
				prCfgPlan = prCfgPlan.then(staged.bind(cfgPlan)).then(show_qarms);
			}
		}
		return prCfgPlan;
	}

	function staged(paths){
		console.log(paths);
		// Find out joints
		var next = this;
		if(!next){return;}
		if(next.left){ next.left.qLArm0 = qLArm; }
		if(next.right){ next.right.qRArm0 = qRArm; }
		return new Promise(function(resolve, reject){
			if(!paths){ reject(); } else { resolve(next); }
		}).then(plan_arm);
	}

	function setup_buttons(){
		//acceptBtn = document.querySelector('button#accept');
		//declineBtn = document.querySelector('button#decline');
		//stepBtn = document.querySelector('button#step');
		//ikBtn = document.querySelector('button#ik');
		//moveBtn = document.querySelector('button#move');
		//teleopBtn = document.querySelector('button#teleop');
		//resetBtn = document.querySelector('button#reset');
		//proceedBtn = document.querySelector('button#proceed');
		//


		jointSel = document.querySelector('select#joints');
		mesh0Sel = document.querySelector('input#mesh0sel');
		mesh1Sel = document.querySelector('input#mesh1sel');
		allBtns = document.querySelectorAll('#topic button');
		shmBtns = document.querySelectorAll('.shm button');

		mesh0Sel.addEventListener('change', function(){
			var is_add = mesh0Sel.checked;
			mesh0.forEach(function(m){
				if(is_add){
					scene.add(m);
				} else {
					scene.remove(m);
				}
			});
		});
		mesh1Sel.addEventListener('change', function(){
			var is_add = mesh1Sel.checked;
			mesh1.forEach(function(m){
				if(is_add){
					scene.add(m);
				} else {
					scene.remove(m);
				}
				//console.log(m);
			});
		});

		jointSel.addEventListener('change', select_joint);

		function sendshm(){
			util.shm(
				'/shm/' + this.getAttribute("data-shm") +
				'/' + this.getAttribute("data-segment") +
				'/' + this.getAttribute("data-key"),
				JSON.parse(this.getAttribute("data-value"))
			);
		}
		function sendfsm(){
			util.shm(
				'/fsm/' + this.getAttribute("data-fsm") +
				'/' + this.getAttribute("data-evt")
			);
		}

		for(var i = 0; i<shmBtns.length; i+=1){
			var btn = shmBtns.item(i);
			if(btn.parentNode.classList.contains("shm")){
				btn.addEventListener('click', sendshm);
			} else if(btn.parentNode.classList.contains("fsm")){
				btn.addEventListener('click', sendfsm);
			}
		}

	}

	function setup3d() {
		scene = new THREE.Scene();
    raycaster = new THREE.Raycaster();
		// Build the scene
		var ground = new THREE.Mesh(
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

	function update_pillars(p){
		/*
		pillars.forEach(function(p0){
			robot.object.remove(p0);
			p0.geometry.dispose();
			p0.geometry = null;
			p0.material.dispose();
			p0.material = null;
			p0 = null;
		});
		*/
		if(typeof p.forEach !== 'function'){ return; }
		p.forEach(function(p0, i){
			var p_cyl = pillars[i];
			if(!p_cyl){
				var geometry = new THREE.CylinderGeometry(15, 15, 500),
					material = new THREE.MeshBasicMaterial({color: 0xffff00});
				p_cyl = new THREE.Mesh(geometry, material);
				pillars.push(p_cyl);
			}
      p_cyl.position.set(p0[1]*1e3, 0, p0[0]*1e3);
      robot.object.add(p_cyl);
		});
	}

	function setup_robot(port){
		// Load the robot
		robot = new ctx.Robot({
			port: port,
			name: 'dale',
			update_pillars: update_pillars,
			callback: function(){
				scene.add(this);
				// Add light from robot
				var spotLight = new THREE.PointLight(0xaaaaaa, 1, 0);
				spotLight.position.set(0, 1000, 0);
				spotLight.castShadow = false;
				this.add(spotLight);
				// Add light from robot
				/*
				var groundLight = new THREE.PointLight(0xaaaaaa, 1, 0);
				spotLight.position.set(0, 2000, -100);
				spotLight.castShadow = false;
				this.add(spotLight);
				*/
				planRobot = new ctx.Robot({
					name: 'dale',
					callback: function(){
						// Add light from robot
						var spotLight = new THREE.PointLight(0xffffff, 1, 0);
						spotLight.position.set(0, 2000, -100);
						spotLight.castShadow = true;
						this.add(spotLight);
						var clearMaterial = new THREE.MeshBasicMaterial({
							color: 0x00ff00,
							transparent: true,
							opacity: 0.5,
						});
						/*
						planRobot.meshes.forEach(function(m){ m.material = clearMaterial; });
						planRobot.object.getObjectByName('L_FOOT').material = clearMaterial;
						planRobot.object.getObjectByName('R_FOOT').material = clearMaterial;
						planRobot.object.getObjectByName('L_WR_FT').material = clearMaterial;
						planRobot.object.getObjectByName('R_WR_FT').material = clearMaterial;
						*/
						planRobot.object.traverse(function(o){
							o.material = clearMaterial;
						});
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
						//planRobot.object.getObjectByName('L_WR_FT').add(planRobot.lhand);
						//planRobot.object.getObjectByName('R_WR_FT').add(planRobot.rhand);
						// TODO: Attach to the group and move the group around
						var lclone = planRobot.object.getObjectByName('L_TIP').clone();
						var rclone = planRobot.object.getObjectByName('R_TIP').clone();
						lclone.name = 'L_TIP_PLAN';
						rclone.name = 'R_TIP_PLAN';
						var rmat = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
						var lmat = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
						lclone.traverse(function(o){
							o.material = lmat;
						});
						rclone.traverse(function(o){
							o.material = rmat;
						});
						lclone.position.set(0,0,0);
						rclone.position.set(0,0,0);
						planRobot.object.getObjectByName('L_TIP').add(lclone);
						planRobot.object.getObjectByName('R_TIP').add(rclone);
						//
						planRobot.lhand = lclone;
						planRobot.rhand = rclone;
						//console.log(planRobot.lhand);
						//console.log(planRobot.rhand);

						scene.add(this);
					}
				});
			}
		});
	}

	function animate() {
		if (controls) { controls.update(); }
		if (tcontrol) { tcontrol.update(); }
		renderer.render(scene, camera);
		window.requestAnimationFrame(animate);
	}

	// Load everything
	function init(){
		Promise.all([
			util.lcss('/css/all_scene.css'),
			util.lcss('/css/gh-buttons.css'),
			util.ljs('/bc/threejs/build/three.js'),
			//util.ljs("/bc/peerjs/peer.min.js"),
			util.ljs("/bc/sprintfjs/sprintf.js"),
			util.ljs("/bc/Keypress/keypress.js"),
			util.ljs("/js/numeric-1.2.6.min.js")
		]).then(function(){
			return Promise.all([
				util.ljs("/VideoFeed.js")
			]);
		}).then(function(){
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
		.then(function(){
			setTimeout(setup3d, 0);
			setTimeout(setup_rtc, 0);
			setTimeout(setup_buttons, 0);
			setTimeout(setup_clicks, 0);
			setTimeout(setup_keys, 0);
		}).then(function(){
			util.ljs('/Estimate.js');
			util.ljs('/Classify.js');
		})
		.then(function(){
			return util.shm('/streams/feedback');
		}).then(setup_robot).catch(function(e){
			console.log('Loading error', e);
		});
	}
	setTimeout(init, 0);

}(this));
