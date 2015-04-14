(function (ctx) {
	'use strict';
	var nlog = 10; // start around 5 :)
	// Private variables
	var d3 = ctx.d3,
		util = ctx.util,
		debug = ctx.util.debug,
		mf = util.mapFuncs,
		console = window.console,
		overlay,
		peer,
		p_conn,
    peer_id = 'all_map',
    peer_scene_id = 'all_scene',
		logname = 'experiment/config'+nlog,
		pose = {x:0, y:0},
		goal = {x:5, y: 0},
		pose_marker,
		goal_marker,
    map_c,
		graph, path,
		human = [],
		links = [],
		polys = [],
		all_points = [],
		polyF = d3.svg.line()
			.x(function (d) { return -d[1]; })
			.y(function (d) { return -d[0]; })
			.interpolate("linear-closed"),
		arcF = d3.svg.line()
			.x(function (d) { return -d[1]; })
			.y(function (d) { return -d[0]; })
			.interpolate("linear");

	/*
	function minDotI(maxI, curDot, i, arr){
    return (curDot > arr[maxI]) ? i : maxI;
  }
	*/

	function local2global(v){
		return [v[0] + this[0], v[1] + this[1]];
	}

	var add_map = {
		cyl: function (params){
			overlay.append("circle")
				.attr("cx", params.xc / -1e3)
				.attr("cy", params.zc / -1e3)
				.attr("r", params.r / 1e3)
				.attr('class', 'obstacle');
		},
		// horiz plane
		h: function (params){
			var view_root = [
				-params.projected.root[1],
				-params.projected.root[0]
			];
			overlay.append("path")
				.attr("d", arcF(params.projected.xy))
				.attr("transform", "translate("+view_root.join(',')+")")
				.attr('class','human')
				.attr('id', 'h'+human.length)
				.attr('style',
					'fill:rgb('+params.colors.mean.map(Math.floor).join(',')+')'
				);
			overlay.append("circle")
				.attr("cx", view_root[0])
				.attr("cy", view_root[1])
				.attr("r", 0.02);
		},
		// vertical plane
		v: function (params){
			overlay.append("path")
				.attr("d", polyF(params.endpoints))
				.attr("transform", "translate(" + 0 + "," + 0 + ")")
				.attr('class', 'wall');
		},
	};

	var add_graph = {
		h: function(params){

						/*
						// TODO: Add here
      // Send to the map
      if(parameters.id==='v'){
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
				// Into 2D
				parameters.projected = {
					root : [parameters.root[2]/1e3, parameters.root[0]/1e3],
					xy : geometry.vertices.map(function(p){return [p.z/1e3, p.x/1e3];}),
					resolution : parameters.poly.resolution
				};
      }
			*/

			var poly0 = {
				center : params.projected.root,
				perimeter: params.projected.xy.map(local2global, params.projected.root),
				rho: params.poly.rhoDist.map(function(v){return v/1e3;}),
				parameters: params
			}, ipoly0 = polys.push(poly0) - 1;
			poly0.id = ipoly0;

			// Match the polys together
			polys.forEach(function(poly1, ipoly1){
				if (ipoly0 === ipoly1) { return; }
				var hp = Classify.halfplanes.call(poly0, poly1),
					intersects = Classify.match(polys, ipoly0, ipoly1, hp[0], hp[1]);
				// Add to all links
				intersects.forEach(function(l){ links.push(l); });
			});
		}
	};

	// Keep track of the mouse trail
	// Trail entries: [x, y, dist, all_points index]
	var trail = [], onTrail = false;
	function mclick(){
		onTrail = !onTrail;
		if (!onTrail) {
			console.log(trail);
			overlay.append("path").attr('class','humanpath').attr("d", arcF(trail));
			savepath(trail);
			Graph.compare_expert_path(graph, trail, path, polys);
			trail = [];
		}
	}
	function mmove(){
		if (!onTrail) { return; }
		// Find the closest point
		//, confidence = Math.exp(-closest[0]);
		var coord = d3.mouse(this),
			coord_real = [-coord[1], -coord[0]],
			closest = all_points.map(mf.dist, coord_real).reduce(mf.smallest, [Infinity, -1]),
			back = trail.pop(),
			//nearby = coord_real.concat(closest);
			nearby = all_points[closest[1]].slice().concat(closest[0]);

		if(!back){ trail.push(nearby); }

		//else if (all_points[back[3]][2] !== all_points[nearby[3]][2])
		else if (back[2] !== nearby[2])
		{ trail.push(back); trail.push(nearby); }

		//else if (all_points[back[3]][3] !== all_points[nearby[3]][3])
		else if (back[3] !== nearby[3])
		{ trail.push(back); trail.push(nearby); }

		else if (back[6] > nearby[6]) { trail.push(nearby); }
		else { trail.push(back); }
	}

	function makegraph(){
		// Check for breakage from non-ground
		polys.forEach(function(poly, ipoly){
			// Break links if needed
			var breakage = links.map(function(l){
				if(ipoly===l.poly_a || ipoly===l.poly_b){return false;}
				var p_a = polys[l.poly_a], p_b = polys[l.poly_b],
					a = p_a.perimeter[l.ind_a] || p_a.center,
					b = p_b.perimeter[l.ind_b] || p_b.center;
						// If the edge is too long, break it
				var dAB = mf.dist.call(a, b);
				if(dAB>0.6){ return true; }
				//console.log('ipoly', ipoly, polys[ipoly].center)
				//console.log('a', a, 'b', b);
				var does_break = Classify.breaks.call(poly, a, b);
				return does_break;
			});
			links = links.filter(function(v, i){ return !breakage[i]; });
		});
		// Make the graph
		graph = Graph.make(polys, links);
		// Plan in the graph
		path = Graph.plan(polys, graph, pose, goal);
		var path_points = path.map(function(p){return p.p;});
		console.log('path_points', path_points);
		// Draw the edges
		console.log(graph);
		Graph.getEdgePairs(graph).forEach(function(l){overlay.append("path").attr('class','arc').attr("d", arcF([l[0], l[1]]));});
		overlay.append("path").attr('class','autopath').attr("d", arcF(path_points));

		// All points for the move to move amongst
		// all_points entries: [x, y, poly index, perimeter index]
		all_points = [];
		graph.nodes.forEach(function(n, i){
			var poly = n.obj;
			if(!poly.id){return;}
			if(n.obj_idx){
				var per = poly.perimeter[n.obj_idx];
				all_points.push(per.concat([poly.id, n.obj_idx, i]));// -1 means center
			} else {
				all_points.push(poly.center.concat([poly.id, -1, i]));// -1 means center
			}

		});
		console.log(all_points);

	}

	// Take in human input and process it. Save it in an array for logging
	var nParse = 0;
	function parse_param(data){
		nParse += 1;
		//if(data.type!='reactive'){return;}
		//if(nParse>4){return;}
		//if(nParse<=4||nParse>7){return;}
		//if(human.length>=3){return;}
		console.log('Loaded '+(data.type||'Unknown'), data);
		if(typeof add_map[data.id] === 'function') {
			add_map[data.id](data);
		}
		if(typeof add_graph[data.id] === 'function') {
			add_graph[data.id](data);
		}
		// Save the data we received
		human.push(data);
	}

	function open(){
		d3.text('/logs/'+logname+'.json').get(function(e,jdata){
			if (e) {
				console.log('Could not open log',e);
			} else {
				debug(['Loaded ' + logname]);
				JSON.parse(jdata).forEach(parse_param);
			}
		});
	}

	function save(){
		var name = 'hmap' + Date.now(), data = JSON.stringify(human);
		debug(['Saving ' + name, data.length + ' bytes']);
		console.log(human);
		d3.text('/log/'+name).post(data, function(e){
			if (e) { console.log('Could not save', e); }
		});
	}
	
	function savepath(trail){
		var name = 'hpath_' + logname.replace('experiment/',''), data = JSON.stringify(trail);
		debug(['Saving ' + name, data.length + ' bytes']);
		console.log('saving...',name);
		d3.text('/log/'+name).post(data, function(e){
			if (e) { console.log('Could not save', e); }
		});
	}

  function setup_rtc (){
    peer = new Peer(peer_id, {host: 'localhost', port: 9000});
    peer.on('open', function(id) { console.log('My peer ID is: ' + id); });
    peer.on('disconnected', function(conn) { console.log('disconnected'); });
    //peer.on('error', function(e) {console.log('error', e);});
    peer.on('close', function() { console.log('close'); });
    p_conn = peer.connect(peer_scene_id);
    p_conn.on('open', function(){ p_conn.send('hello from a map'); });
    p_conn.on('close', function(){ console.log('p_conn closed'); });
    p_conn.on('data', parse_param);
  }

	// Add the robot marker
	function draw_pose(){
		if(pose_marker===undefined) {
			var data = [[0, 0], [-0.25, 0.05], [-0.25, -0.05]];
			pose_marker = overlay
				.append('path')
				.attr('id', 'pose')
				.attr("d", polyF(data));
		}
		pose_marker.attr("transform",
										 "translate(" + -pose.y + "," + -pose.x + ")");
	}

	function draw_goal(){
		if(goal_marker===undefined) {
			var data = [
				[0, 0], [0.1, 0], [0, 0.1], [-0.1, 0], [0, -0.1], [0.1, 0]
			];
			goal_marker = overlay
				.append('path')
				.attr('id', 'pose')
				.attr("d", polyF(data));
		}
		goal_marker.attr("transform",
										 "translate(" + -goal.y + "," + -goal.x + ")");
	}

  function setup_dom(){
    map_c = d3.select('#map_container').node();
  	// Add the overlay
  	overlay = d3.select("#map_container").append("svg").attr('class', 'overlay')
	    .attr('viewBox', "-2 -5 4 6").attr('preserveAspectRatio', "none")
	    .attr('width', map_c.clientWidth).attr('height', map_c.clientHeight)
			.on('mousemove', mmove)
			.on('click', mclick);
		// Allow saving
		d3.select('button#save').on('click', save);
		d3.select('button#open').on('click', open);
		d3.select('button#graph').on('click', makegraph);
		
		// Draw the robot icon
		window.setTimeout(draw_pose, 0);
		// Draw the robot goal
		window.setTimeout(draw_goal, 0);
		// Connect with the peer
		//window.setTimeout(setup_rtc, 0);
		// Open logs
		window.setTimeout(open, 0);
  }

	// Handle resizing
	window.addEventListener('resize', function () {
    overlay.attr('width', map_c.clientWidth)
			.attr('height', map_c.clientHeight);
	}, false);

	// Load resources
	util.ljs('/Classify.js');
	util.ljs('/Graph.js');
	util.ljs('/bc/js-priority-queue/priority-queue.min.js');
	ctx.util.lcss('/css/gh-buttons.css');
	ctx.util.lcss('/css/all_map.css', function () {
		d3.html('/view/all_map.html', function (error, view) {
			// Remove landing page elements and add new content
			d3.select("div#landing").remove();
			document.body.appendChild(view);
      window.setTimeout(setup_dom, 0);
		});
	});

}(this));
