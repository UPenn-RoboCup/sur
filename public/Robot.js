(function (ctx) {
	'use strict';

	var THREE = ctx.THREE,
		jointNames = ctx.util.jointNames,
		xAxis = new THREE.Vector3( 1, 0, 0 );

	var IDS_LARM = [2, 3, 4,  5,  6, 7, 8];
	var IDS_RARM = [21, 22, 23, 24, 25, 26, 27];
	var IDS_WAIST = [28, 29];

	function jet_temp(temp, mesh){
		if(!mesh.material){return;}
		var fourValue = 4 * Math.max(0, Math.min((temp - 50) / 80, 1));
		mesh.material.color.setRGB(
			Math.min(fourValue - 1.5, 4.5 - fourValue),
			Math.min(fourValue - 0.5, 3.5 - fourValue),
			Math.min(fourValue + 0.5, 2.5 - fourValue)
		);
	}

	function Robot(options) {
		var loader = new THREE.ObjectLoader(),
			object, meshes, qDefault, ws;
		if(options.port){
			ws = new window.WebSocket('ws://' + window.location.hostname + ':' + options.port);
			ws.onmessage = function (e) {
				if (typeof e.data !== "string") { return; }
				if(!meshes){return;}
				var feedback = JSON.parse(e.data);
				var qQuat;
				if (feedback.p){
					qQuat = feedback.p.map(function(q){
						return new THREE.Quaternion().setFromAxisAngle(xAxis, q);
					});
				}
				var cqQuat = feedback.cp.map(function(q){
					return new THREE.Quaternion().setFromAxisAngle(xAxis, q);
				});
				// Use cq or q
				var quatUsed = cqQuat;
				meshes.forEach(function(m, i){
					if(!m){return;}
					m.quaternion.multiplyQuaternions(qDefault[i], quatUsed[i]);
					m.cquaternion.multiplyQuaternions(qDefault[i], cqQuat[i]);
					//m.pquaternion.multiplyQuaternions(qDefault[i], qQuat[i]);
					//m.matrixWorldNeedsUpdate = true;
					if(feedback.tm){jet_temp(feedback.tm[i], m);}
				});
				var torso = feedback.u;
				object.quaternion.setFromEuler(new THREE.Euler(torso[4], torso[5], torso[3], 'ZXY'));
				object.position.z = torso[0] * 1e3;
				object.position.x = torso[1] * 1e3;
				object.position.y = torso[2] * 1e3;
				var pillars = feedback.s;
				if(pillars && options.update_pillars){
					options.update_pillars(pillars);
				}
			};
		}

		this.setJoints = function(q, i) {
			//console.log(q, i);
			var qQuat = new THREE.Quaternion().setFromAxisAngle(xAxis, q);
			//console.log(qQuat);
			meshes[i].quaternion.multiplyQuaternions(qDefault[i], qQuat);
		};

		this.foot = new THREE.Mesh(
			new THREE.BoxGeometry( 100, 10, 200 ),
			new THREE.MeshBasicMaterial( { color: 0xffff00 } )
		);
/*
		this.lhand = new THREE.Mesh(
			new THREE.BoxGeometry( 25, 25, 25 ),
			new THREE.MeshBasicMaterial( { color: 0xffff00 } )
		);

		this.rhand = new THREE.Mesh(
			new THREE.BoxGeometry( 25, 25, 25 ),
			new THREE.MeshBasicMaterial( { color: 0xff0000 } )
		);
*/

		this.name = options.name || 'thorop2';
		// assuming we loaded a JSON structure from elsewhere
		loader.load('json/' + this.name + '.json', function(o){
			//console.log('THOROP2', object, this);
			object = o;
			meshes = jointNames.map(function(name){return o.getObjectByName(name) || new THREE.Object3D();});
			qDefault = meshes.map(function(m){
				return m.quaternion.clone();
			});
			// Save the commands. TODO: userData
			meshes.forEach(function(m){
				m.cquaternion = new THREE.Quaternion();
			});
			this.meshes = meshes;
			this.object = object;
			this.qDefault = qDefault;
			if(options.callback){setTimeout(options.callback.bind(o),0);}

		}.bind(this));

		this.IDS_LARM = IDS_LARM;
		this.IDS_RARM = IDS_RARM;
		this.IDS_WAIST = IDS_WAIST;
	}

	ctx.Robot = Robot;

}(this));
