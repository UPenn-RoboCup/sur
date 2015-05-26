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
		resetBtn, goBtn, moveBtn, teleopBtn, stepBtn, ikBtn,
		jointSel, mesh0Sel, mesh1Sel, allBtns;

	// State variables
	var qPlan, qNow, qHead, qHead0, sameHead,
qLArm, qLArm0, sameLArm, qRArm, qRArm0, sameRArm,
qWaist, qWaist0, sameWaist,
sameLArmTF, sameRArmTF,
comWorldPlan, comWorldNow, invComWorldNow, invComWorldPlan;

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
			var wplan = plan[2].length ? plan[1] : false;
			if(!lplan && !rplan && !wplan){reject();}
			resolve([lplan, rplan, wplan]);
		});
	}

	function playPlan(plans) {
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
		if(plans[0]){
			promises.push(
				util.loop(plans[0].filter(halfsec), updatechain.bind(planRobot.IDS_LARM), play_rate));
		} else {
			promises.push(false);
		}
		if(plans[1]){
			promises.push(
				util.loop(plans[1].filter(halfsec), updatechain.bind(planRobot.IDS_RARM), play_rate));
		} else {
			promises.push(false);
		}
		if(plans[2]){
			promises.push(
				util.loop(plans[2].filter(halfsec), updatechain.bind(planRobot.IDS_WAIST), play_rate));
		} else {
			promises.push(false);
		}

		// TODO: catch on bad plan or user cancel
		var prAll = Promise.all(promises);
		prAll.stop = function(){
			promises.forEach(function(pr){
				if(pr && pr.h){pr.stop();}
			});
			return plans;
		};
		return prAll;
	}

	function reset_hands(){
		if(document.querySelector('button#ik').getAttribute('data-hand')==='L_TIP'){
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
		if(getMode()!=='teleop'){ return; }
		var motor = planRobot.object.getObjectByName(jointSel.value);
		if(!motor){return;}
		tcontrol.detach();
		tcontrol.attach(motor);
		return motor;
	}

	function click_step(){
		switch(getMode()){
			case 'move':
			case 'ik':
			case 'teleop':
				return;
			case 'step':
				tcontrol.detach();
				resetLabels();
				return;
			default:
				stepBtn.innerHTML = 'Done';
				goBtn.innerHTML = 'Go';
				teleopBtn.innerHTML = 'Rotate';
				break;
		}
		var gfoot = planRobot.foot;
		var lfoot = planRobot.object.getObjectByName('L_FOOT');
		var rfoot = planRobot.object.getObjectByName('R_FOOT');
		lfoot.remove(gfoot);
		rfoot.remove(gfoot);
		if(stepBtn.getAttribute('data-foot')==='L_FOOT'){
			lfoot.add(gfoot);
			moveBtn.innerHTML = 'Right';
		} else {
			rfoot.add(gfoot);
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
	}

	function click_teleop(){
		switch(getMode()){
			case 'move':
				if(teleopBtn.innerHTML==='Rotate'){
					// Set the rotate methods
					tcontrol.enableX = false;
					tcontrol.enableY = true;
					tcontrol.enableZ = false;
				} else {
					tcontrol.enableX = true;
					tcontrol.enableY = false;
					tcontrol.enableZ = true;
				}
			case 'ik':
			case 'step':
				// Switches between rotate/translate
				if(teleopBtn.innerHTML==='Rotate'){
					teleopBtn.innerHTML = 'Translate';
					tcontrol.setMode('rotate');
				} else {
					teleopBtn.innerHTML = 'Rotate';
					tcontrol.setMode('translate');
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
				teleopBtn.innerHTML = 'Done';
				stepBtn.innerHTML = 'Decline';
				goBtn.innerHTML = 'Plan';
				moveBtn.innerHTML = 'Undo';
				ikBtn.innerHTML = '_';
				// Tell the robot to go into teleop
				//util.shm('/fsm/Head/teleop', true);
				util.shm('/fsm/Arm/teleopraw', true);
				break;
		}
		if(select_joint()){
			tcontrol.setMode('rotate');
			tcontrol.space = 'local';
			tcontrol.enableY = false;
			tcontrol.enableZ = false;
			tcontrol.enableXYZE = false;
			tcontrol.enableE = false;
		}
	}

	function click_ik(){
		switch(getMode()){
			case 'move':
			case 'teleop':
			case 'teleop':
			case 'step':
				return;
			case 'ik':
				tcontrol.detach();
				resetLabels();
				return;
			default:
				ikBtn.innerHTML = 'Done';
				goBtn.innerHTML = 'Plan';
				stepBtn.innerHTML = '_';
				teleopBtn.innerHTML = 'Rotate';
				util.shm('/fsm/Arm/teleop', true);
				break;
		}
		tcontrol.detach();
		if(this.getAttribute('data-hand')==='L_TIP'){
			tcontrol.attach(planRobot.lhand);
			this.setAttribute('data-hand', 'L_TIP');
			moveBtn.innerHTML = 'Right';
		} else {
			tcontrol.attach(planRobot.rhand);
			this.setAttribute('data-hand', 'R_TIP');
			moveBtn.innerHTML = 'Left';
		}
		tcontrol.space = 'local';
		tcontrol.setMode('translate');
		tcontrol.enableX = true;
		tcontrol.enableY = true;
		tcontrol.enableZ = true;
	}

	function click_reset(){
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
				//reset_joints = true;
				break;
			default:
				// Reset All
				reset_com = true;
				reset_joints = true;
				reset_step = true;
				//reset_ik = true;
				planRobot.lhand.position.set(0,0,0);
				planRobot.lhand.quaternion.copy(new THREE.Quaternion());
				planRobot.rhand.position.set(0,0,0);
				planRobot.rhand.quaternion.copy(new THREE.Quaternion());
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
			reset_hands();
		}
	}

	function click_move(){
		switch(getMode()){
			case 'step':
				var gfoot = planRobot.foot;
				var lfoot = planRobot.object.getObjectByName('L_FOOT');
				var rfoot = planRobot.object.getObjectByName('R_FOOT');
				lfoot.remove(gfoot);
				rfoot.remove(gfoot);
				gfoot.position.set(0,0,0);
				gfoot.quaternion.copy(new THREE.Quaternion());
				// Change feet
				if(stepBtn.getAttribute('data-foot')==='L_FOOT'){
					stepBtn.setAttribute('data-foot', 'R_FOOT');
					moveBtn.innerHTML = 'Left';
					rfoot.add(gfoot);
					gfoot.material.color.setHex(0xff0000);
				} else {
					stepBtn.setAttribute('data-foot', 'L_FOOT');
					moveBtn.innerHTML = 'Right';
					lfoot.add(gfoot);
					gfoot.material.color.setHex(0xffff00);
				}
				return;
			case 'ik':
				// Switch hands
				tcontrol.detach();
				if(ikBtn.getAttribute('data-hand')==='L_TIP'){
					ikBtn.setAttribute('data-hand', 'R_TIP');
					tcontrol.attach(planRobot.rhand);
					moveBtn.innerHTML = 'Left';
				} else {
					ikBtn.setAttribute('data-hand', 'L_TIP');
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
				moveBtn.innerHTML = 'Done';
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
	}

	function plan_arm(plan){
		var success = true;
		var h_accept, h_decline;
		goBtn.innerHTML = 'Planning...';
		goBtn.classList.add('danger');
		return util.shm('/armplan', plan)
		.then(procPlan)
		.then(function(plans){
			goBtn.innerHTML = 'Accept';
			stepBtn.innerHTML = 'Decline';
			var prPlay = playPlan(plans);
			prPlay.then(function(){
				console.log('Finished playing');
			}).catch(function(){
				console.log('Interrupted playing');
			}).then(function(){
				goBtn.classList.remove('danger');
			});
			var prAccept = new Promise(function(resolve) {
				h_accept = goBtn.addEventListener('click', function(e){
					e.stopPropagation();
					resolve();
				});
			});
			var prDecline = new Promise(function(resolve, reject) {
				h_decline = stepBtn.addEventListener('click', function(e){
					e.stopPropagation();
					reject();
				});
			});
			return Promise.race([prAccept, prDecline]).catch(function(){
				// Rejection goes here
				// Reset the arms
				planRobot.meshes.forEach(function(m, i){
					m.quaternion.copy(this[i].cquaternion);
				}, robot.meshes);
				success = false;
			}).then(function(){
				console.log('Cleaning up');
				goBtn.removeEventListener('click', h_accept);
				goBtn.removeEventListener('click', h_decline);
				goBtn.innerHTML = 'Plan';
				stepBtn.innerHTML = '_';
				console.log('Canceling playback');
				var plans = prPlay.stop();
				return success ? plans : false;
			});
		});
	}

	function go_ik(){
		if(goBtn.innerHTML !== 'Plan'){
			return;
		}

		// Always with respect to our com position.
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
				if(ikBtn.getAttribute('data-hand')==='L_TIP'){
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

		return plan_arm({left: lPlan, right: rPlan}).then(function(plans){
			console.log('Sending IK', plans);
			if(!plans){return;}
			// TODO: Set the final arm configs

			return Promise.all([
				plans[0] ? util.shm('/shm/hcm/teleop/lweights', [1,1,0]) : false,
				plans[1] ? util.shm('/shm/hcm/teleop/rweights', [1,1,0]) : false,
				plans[2] ? util.shm('/shm/hcm/teleop/waist', qWaist) : false,
				plans[0] ? util.shm('/shm/hcm/teleop/tflarm', lPlan.tr) : false,
				plans[1] ? util.shm('/shm/hcm/teleop/tfrarm', rPlan.tr) : false
			]);
		});
	}

	function go_teleop(){
		if(goBtn.innerHTML !== 'Plan'){
			return;
		}

		if(!sameHead){util.shm('/shm/hcm/teleop/head', qHead);}

		if(sameLArm && sameRArm && sameWaist){
			return;
		}

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

		return plan_arm({left: lPlan, right: rPlan}).then(function(plans){
			console.log('Sending Q', plans);
			if(!plans){return;}
			return Promise.all([
				sameWaist ? true : util.shm('/shm/hcm/teleop/waist', qWaist),
				sameLArm ? true : util.shm('/shm/hcm/teleop/larm', qLArm),
				sameRArm ? true : util.shm('/shm/hcm/teleop/rarm', qRArm)
			]);
		});

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
		return util.shm('/shm/hcm/teleop/waypoint?fsm=Body&evt=approach', relPose);
	}

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
			util.shm('/fsm/Body/stepover1', true);
		});
	}

	var go_promises = {
		move: go_move,
		step: go_step,
		ik: go_ik,
		teleop: go_teleop,
	};

	function click_go(){
		var m = getMode();
		if(!m){return;}
		var f = go_promises[m];
		if(!f){return;}
		calculate_state();
		return f();
		//util.shm('/shm/hcm/state/proceed', [1]);
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
			//material = new THREE.MeshPhongMaterial({
      material = new THREE.MeshBasicMaterial({
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
		//geometry.computeBoundingSphere();
    //geometry.computeBoundingBox();
		// Phong Material requires normals for reflectivity
    // TODO: Perform the normals computation in the Worker thread maybe?
		//geometry.computeVertexNormals();
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

			util.debug([
				mesh.name,
				sprintf("Offset: %0.2f %0.2f %0.2f", offset_msg[2], offset_msg[0], offset_msg[1]),
				sprintf("Global: %0.2f %0.2f %0.2f", global_msg[2], global_msg[0], global_msg[1]),
				sprintf("%0.2f %0.2f %0.2f", offset_msg[2], offset_msg[0], global_msg[1]),
			]);

			// Default gives a text cursor
			if (e.button === 1) {
				// Middle click

				switch(getMode()){
					case 'ik':
						var ikBtn = document.getElementById('ik');
						var cur = ikBtn.getAttribute('data-hand');
						if(cur==='L_TIP'){
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
		if(getMode()!=='move'){ return; }
		var mat = planRobot.object.matrix.multiply(this);
		planRobot.object.position.setFromMatrixPosition(mat);
		planRobot.object.quaternion.setFromRotationMatrix(mat);
	}
	function delta_hand(){
		if(getMode()!=='ik'){ return; }
		var hand;
		if(document.querySelector('button#ik').getAttribute('data-hand')==='L_TIP'){
			hand = planRobot.lhand;
		} else {
			hand = planRobot.rhand;
		}
		var mat = hand.matrix.multiply(this);
		hand.position.setFromMatrixPosition(mat);
		hand.quaternion.setFromRotationMatrix(mat);
	}
	function setup_keys(){
		var listener = new keypress.Listener();
		listener.simple_combo("i", delta_walk.bind(
			new THREE.Matrix4().makeTranslation(0,0,100)));
		listener.simple_combo(",", delta_walk.bind(
			new THREE.Matrix4().makeTranslation(0,0,-100)));
		listener.simple_combo("h", delta_walk.bind(
			new THREE.Matrix4().makeTranslation(100,0,0)));
		listener.simple_combo(";", delta_walk.bind(
			new THREE.Matrix4().makeTranslation(-100,0,0)));
		listener.simple_combo("j", delta_walk.bind(
			new THREE.Matrix4().makeRotationY(10*util.DEG_TO_RAD)));
		listener.simple_combo("l", delta_walk.bind(
			new THREE.Matrix4().makeRotationY(-10*util.DEG_TO_RAD)));
		listener.simple_combo("k", function(){
			planRobot.object.position.copy(robot.object.position);
			planRobot.object.quaternion.copy(robot.object.quaternion);
		});
		//
		listener.simple_combo("i", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(0,0,25)));
		listener.simple_combo(",", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(0,0,-25)));
		listener.simple_combo("h", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(25,0,0)));
		listener.simple_combo(";", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(-25,0,0)));
		listener.simple_combo("u", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(0,25,0)));
		listener.simple_combo("m", delta_hand.bind(
			new THREE.Matrix4().makeTranslation(0,-25,0)));
		listener.simple_combo("j", delta_hand.bind(
			new THREE.Matrix4().makeRotationY(5*util.DEG_TO_RAD)));
		listener.simple_combo("l", delta_hand.bind(
			new THREE.Matrix4().makeRotationY(-5*util.DEG_TO_RAD)));
		listener.simple_combo("k", reset_hands);
		//
		listener.simple_combo("space", click_go);
		listener.simple_combo("backspace", click_reset);
		listener.simple_combo("9", click_move);
		//listener.simple_combo("escape", click_escape);
		//
		listener.simple_combo("2", function(){
			util.shm('/Config/arm/init').then(function(cfg){
				return plan_arm(cfg[1]).then(function(valid){
					return plan_arm(cfg[2]);
				});
			});

		});
	}

	function setup_buttons(){
		resetBtn = document.querySelector('button#reset');
		goBtn = document.querySelector('button#go');
		moveBtn = document.querySelector('button#move');
		teleopBtn = document.querySelector('button#teleop');
		stepBtn = document.querySelector('button#step');
		ikBtn = document.querySelector('button#ik');
		jointSel = document.querySelector('select#joints');
		mesh0Sel = document.querySelector('input#mesh0sel');
		mesh1Sel = document.querySelector('input#mesh1sel');
		allBtns = document.querySelectorAll('#topic button');

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
		resetBtn.addEventListener('click', click_reset);
		goBtn.addEventListener('click', click_go);
		moveBtn.addEventListener('click', click_move);
		stepBtn.addEventListener('click', click_step);
		ikBtn.addEventListener('click', click_ik);
		teleopBtn.addEventListener('click', click_teleop);

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

		p.forEach(function(p0, i){
			var p_cyl = pillars[i];
			if(!p_cyl){
				var geometry = new THREE.CylinderGeometry(15, 15, 10000),
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
				var spotLight = new THREE.PointLight(0xffffff, 1, 0);
				spotLight.position.set(0, 2000, -100);
				spotLight.castShadow = true;
				this.add(spotLight);
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

}(this));
