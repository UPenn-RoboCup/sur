(function (ctx) {
	'use strict';
	// Private variables
	var d3 = ctx.d3,
		debug = ctx.util.debug,
		overlay,
		peer,
		p_conn,
    peer_id = 'all_map',
    peer_scene_id = 'all_scene',
		logname = 'hmap1424128107208',
		pose = {x:0, y:0},
		goal = {x:2.5, y: -2.5},
		pose_marker,
		goal_marker,
    map_c,
		human = [],
		links = [],
		polys = [],
		all_points = [],
		pow = Math.pow, sqrt = Math.sqrt,
		polyF = d3.svg.line()
			.x(function (d) { return -d[1]; })
			.y(function (d) { return -d[0]; })
			.interpolate("linear-closed"),
		arcF = d3.svg.line()
			.x(function (d) { return -d[1]; })
			.y(function (d) { return -d[0]; })
			.interpolate("linear");

	function local2global(v){
		return [v[0] + this[0], v[1] + this[1]];
	}
	function dist(p){
		return sqrt(pow(this[0] - p[0], 2) + pow(this[1] - p[1], 2));
	}
	function smallest(prev, now, inow){
		return now < prev[0] ? [now, inow] : prev;
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
			var view_root = [-params.projected.root[1], -params.projected.root[0]],
			patch = overlay.append("path")
				.attr("d", polyF(params.projected.xy))
				.attr("transform", "translate("+view_root.join(',')+")");
			// Color correctly
			if (params.features[0] > 20){
				patch.attr('class', 'flat');
			} else {
				patch.attr('class', 'step');
			}

			patch.attr('style','fill:rgb('+params.colors.mean.map(Math.floor).join(',')+')');

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
			var poly0 = {
				center : params.projected.root,
				perimeter: params.projected.xy.map(local2global, params.projected.root),
				rho: params.poly.rhoDist.map(function(v){return v/1e3;}),
				parameters: params
			}, ipoly0 = polys.push(poly0) - 1;
			poly0.id = ipoly0;

			// Match the polys together
			var halfplane_indices = polys.map(Classify.halfplanes, poly0);
			polys.forEach(function(poly1, ipoly1){
				var hp = halfplane_indices[ipoly1],
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
			Classify.add_true_path(trail, all_points, polys);
			overlay.append("path").attr('class','humanpath').attr("d", arcF(trail));
			trail = [];
		}
	}
	function mmove(){
		if (!onTrail) { return; }
		// Find the closest point
		//, confidence = Math.exp(-closest[0]);
		var coord = d3.mouse(this),
			coord_real = [-coord[1], -coord[0]],
			closest = all_points.map(dist, coord_real).reduce(smallest, [Infinity, -1]),
			back = trail.pop(),
			nearby = coord_real.concat(closest);
		if(!back){
			trail.push(nearby);
		} else if (back[3] != nearby[3]){
			trail.push(back);
			trail.push(nearby);
		} else if (back[2] > nearby[2]) {
			trail.push(nearby);
		} else {
			trail.push(back);
		}
	}

	function graph(){
		// Check for breakage from non-ground
		polys.forEach(function(poly, ipoly){
			if(poly.parameters.features[0]>20) {return;}
			// Break links if needed
			var breakage = links.map(function(l){
				var a = polys[l.poly_a].perimeter[l.ind_a] || polys[l.poly_a].center,
					b = polys[l.poly_b].perimeter[l.ind_b] || polys[l.poly_b].center,
					does_break = Classify.breaks(poly, a, b);
				return does_break;
			});
			links = links.filter(function(v, i){ return !breakage[i]; });
		});
		// All points for the move to move amongst
		// all_points entries: [x, y, poly index, perimeter index]
		all_points = polys.reduce(function(prev, p, i){
			prev.push(p.center.concat([i, -1]));// -1 means center
			return prev.concat(p.perimeter.map(function(pp, ii){
				return pp.concat([i, ii]);
			}));
		}, []);
		// Make the graph
		var graph = Graph.make(polys, links);
		// Plan in the graph
		var path_points = Graph.plan(polys, graph, pose, goal);
		console.log('path_points', path_points);
		// Draw the edges
		//Graph.getEdgePairs(graph).forEach(function(l){overlay.append("path").attr('class','arc').attr("d", arcF([l[0], l[1]]));});
		overlay.append("path").attr('class','autopath').attr("d", arcF(path_points));
	}

	// Take in human input and process it. Save it in an array for logging
	function parse_param(data){
		console.log('Loaded', data);
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
				var data = JSON.parse(jdata);
				// not the last element:
				//data.pop();
				data.forEach(parse_param);
			}
		});
	}

	function save(){
		var name = 'hmap' + Date.now(), data = JSON.stringify(human);
		debug(['Saving ' + name, data.length + ' bytes']);
		console.log(human);
		d3.text('/log/'+name).post(data, function(e,d){
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
		pose_marker.attr("transform", "translate(" + -pose.y + "," + -pose.x + ")");
	}

	function draw_goal(){
		if(goal_marker===undefined) {
			var data = [[0, 0], [0.1, 0], [0, 0.1], [-0.1, 0], [0, -0.1], [0.1, 0]];
			goal_marker = overlay
				.append('path')
				.attr('id', 'pose')
				.attr("d", polyF(data));
		}
		goal_marker.attr("transform", "translate(" + -goal.y + "," + -goal.x + ")");
	}

  function setup_dom(){
    map_c = d3.select('#map_container').node();
  	// Add the overlay
  	overlay = d3.select("#map_container").append("svg").attr('class', 'overlay')
	    .attr('viewBox', "-3 -3 6 6").attr('preserveAspectRatio', "none")
	    .attr('width', map_c.clientWidth).attr('height', map_c.clientHeight)
			.on('mousemove', mmove)
			.on('click', mclick);
		// Allow saving
		d3.select('button#save').on('click', save);
		d3.select('button#open').on('click', open);
		d3.select('button#graph').on('click', graph);
		// Draw the robot icon
		window.setTimeout(draw_pose, 0);
		// Draw the robot goal
		window.setTimeout(draw_goal, 0);
		// Connect with the peer
		window.setTimeout(setup_rtc, 0);
		// Open logs
		//window.setTimeout(open, 0);
  }

	// Handle resizing
	window.addEventListener('resize', function () {
    overlay.attr('width', map_c.clientWidth).attr('height', map_c.clientHeight);
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
