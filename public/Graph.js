(function (ctx) {
	'use strict';

	var numeric = ctx.numeric,
		mf = ctx.util.mapFuncs,
		abs = Math.abs,
		sqrt = Math.sqrt,
		exp = Math.exp,
		SEARCH_UNDEFINED = 0,
		SEARCH_SEARCHING = 1,
		SEARCH_SUCCESS = 2,
		SEARCH_FAILED = 3,
		NODE_OPEN = 0,
		NODE_CLOSED = 1;

		// Returns: [x, y, poly idx, perimeter index]
	function node2point(node) {
		if (typeof node.obj_idx === 'number') {
			return node.obj.perimeter[node.obj_idx]
				.concat(node.obj.id, node.obj_idx);
		} else if (node.obj_tree) {
			return node.obj.center.concat(node.obj.id, -1);
		} else {
			// Start or goal... TBD
			return [node.obj.x, node.obj.y, -1, -1];
		}
	}

	// Needs d3 for now
	function getEdgePairs(graph) {
		return graph.edges.map(function (edge) {
			return [node2point(this[edge.a]), node2point(this[edge.b])];
		}, graph.nodes);
	}

	function astar_step(graph) {
		var edges = graph.edges,
			nodes = graph.nodes,
			openList = graph.openList,
			searchState = graph.searchState,
			goal_index = graph.goal_index,
			goal = nodes[goal_index],
			n;

		if (searchState !== SEARCH_SEARCHING) {
			return searchState;
		}

		if (openList.length === 0) {
			searchState = SEARCH_FAILED;
			return searchState;
		}

		// Grab the next node to explore
		// Objects, not addresses, are in the queue
		n = openList.dequeue();
		n.state = NODE_CLOSED;

		// Check for the goal
		if (n.id === goal_index) {
			searchState = SEARCH_SUCCESS;
			return searchState;
		}

		// Current node popped from open list is not goal
		n.edges.forEach(function (e_id) {
			var e = edges[e_id],
				target_index = (e.a === this.id) ? e.b : e.a,
				target_node = nodes[target_index],
				outbound_cost = numeric.dot(n.wb, e.f),
				inbound_cost = numeric.dot(target_node.wa, e.f),
				gnew = this.g + Math.exp(target_node.cost + outbound_cost + inbound_cost);
			if (target_node.h === undefined) {
				// Evaluate the heuristic if not done yet
				target_node.g = gnew;
				target_node.h = mf.dist.call(goal.p, target_node.p);
				target_node.f = target_node.g + target_node.h;
				target_node.parent = this.id;
				target_node.state = NODE_OPEN;
				openList.queue(target_node);
			} else if (gnew < target_node.g) {
				target_node.g = gnew;
				target_node.f = target_node.g + target_node.h;
				target_node.parent = this.id;
				if (target_node.state === NODE_CLOSED) {
					target_node.state = NODE_OPEN;
					openList.queue(target_node);
				}
			} else {
				// Node changed on open list: need to sort open list again
				openList.priv._heapify();
			}
		}, n);
		searchState = SEARCH_SEARCHING;
		return searchState;
	}

	function plan(polys, graph, pose, goal) {
		// Find the path to each free space
		// TODO: Check the obstruction
		// Distances in unknown have distance cost, distances in green have finite small cost

		// Add start node
		var pose_xy = [pose.x, pose.y],
			pose_node = { edges : [], obj: pose };
		pose_node.id = graph.nodes.push(pose_node) - 1;
		// Add to the graph
		polys.forEach(function (poly, id) {
			var closest = poly.perimeter.map(mf.dist, pose_xy).reduce(mf.smallest, [Infinity, -1]),
				id_close = closest[1],
				id_node = graph.nodes[id].obj_tree[id_close],
				a = pose_xy, b = poly.perimeter[id_close], dAB = mf.dist.call(a, b);
			
			// If link too long
			if(dAB>1){return;}
			//console.log('\n***');
			// Check for breakage
			var is_broken = polys.map(function(polyO, ipolyO){
				if(ipolyO===id){return false;}
				return Classify.breaks.call(polyO, a, b);
			}).reduce(function(prev, now){
				return prev || now;
			});
			//console.log('dAB',dAB, is_broken);
			// dont add
			if(is_broken){ return; }
			
			if(id_node===-1){
				// node does not exist yet
				var closest_node = graph.nodes[id].obj_tree[id_close] = {
					edges: [], obj: poly, obj_idx: id_close
				};
				id_node = closest_node.id = graph.nodes.push(closest_node) - 1;
			}

			var e = { f: [closest[0],0], a: pose_node.id, b: id_node };
			e.id = graph.edges.push(e) - 1;
			var n_a = graph.nodes[e.a], n_b = graph.nodes[e.b];
			n_a.edges.push(e.id);
			n_b.edges.push(e.id);

			// NEED TO CONNECT PERIMETER TO THE CENTER
			// TODO: Check if this link already exists!
			var e_poly_direct = {a: id_node, b: id, f: 0 };
			e_poly_direct.id = graph.edges.push(e_poly_direct) - 1;
			graph.nodes[id].edges.push(e_poly_direct.id);
			graph.nodes[id_node].edges.push(e_poly_direct.id);

		});

		// Same for goal
		var goal_xy = [goal.x, goal.y],
			goal_node = { edges : [], obj: goal };
		goal_node.id = graph.nodes.push(goal_node) - 1;
		// Add to the graph
		polys.forEach(function(poly, id){
			var closest = poly.perimeter.map(mf.dist, goal_xy).reduce(mf.smallest, [Infinity, -1]),
				id_close = closest[1],
				id_node = graph.nodes[id].obj_tree[id_close];
			
			// Check for breakage
			var is_broken = polys.map(function(polyO, ipolyO){
				if(ipolyO===id){return false;}
				var a = goal_xy, b = poly.perimeter[id_close], dAB = mf.dist.call(a, b);
				if(dAB>1){ return true; }
				return Classify.breaks.call(polyO, a, b);
			}).reduce(function (prev, now) {
				return prev || now;
			});
			// dont add
			if(is_broken){ return; }
			
			if(id_node===-1){
				var closest_node = graph.nodes[id].obj_tree[id_close] = {
					edges: [], obj: poly, obj_idx: id_close
				};
				id_node = closest_node.id = graph.nodes.push(closest_node) - 1;
			}

			// NEED TO CONNECT PERIMETER TO THE CENTER
			// TODO: Check if this link already exists!
			var e_poly_direct = {a: id_node, b: id, f: 0 };
			e_poly_direct.id = graph.edges.push(e_poly_direct) - 1;
			graph.nodes[id].edges.push(e_poly_direct.id);
			graph.nodes[id_node].edges.push(e_poly_direct.id);

			var e = { f: [closest[0],0], a: goal_node.id, b: id_node };
			e.id = graph.edges.push(e) - 1;
			var n_a = graph.nodes[e.a], n_b = graph.nodes[e.b];
			n_a.edges.push(e.id);
			n_b.edges.push(e.id);

		});

		// Set the pqueue
		graph.searchState = SEARCH_SEARCHING;
		graph.openList = new PriorityQueue({
			comparator: function(a, b) { return a.f - b.f; }
		});
		graph.goal_index = goal_node.id;
		graph.start_index = pose_node.id;
		// Easy access to the heuristic argument
		graph.nodes.forEach(function(n){
			n.p = node2point(n);
			n.w  = [0,0,0];
			n.wa = [0,0];
			n.wb = [0,0];
			if(n.cost===undefined){
				// Add cost for leaf nodes
				if(n.obj_idx){
					//console.log(n.obj);
					n.cost = numeric.dot(n.obj.parameters.features, n.w);
				} else {
					// No cost for the center node
					n.cost = 1;
				}
			}
		});
		// Edge cost
		graph.edges.forEach(function(e){
			if(typeof e.cost!=='number'){
				var na, nb;
				na = graph.nodes[e.a];
				nb = graph.nodes[e.b];
				// symmetric edge features, so weight order doesn't matter
				var d = mf.dist.call(na.p, nb.p);
				var ha = na.obj.parameters ? na.obj.parameters.root[1] : 0;
				var hb = nb.obj.parameters ? nb.obj.parameters.root[1] : 0;
				var hd = Math.abs(hb-ha);
				var f = [d, hd];
				e.f = f;
				//e.cost = Math.exp( numeric.dot(f, [0,0]) + numeric.dot(f, [0,0]) );
			}
		});

		pose_node.g = 0;
		pose_node.h = mf.dist.call(goal_node.p, pose_node.p);
		pose_node.f = pose_node.g + pose_node.h;
		//pose_node.parent = 0;
		pose_node.state = NODE_OPEN;
		graph.openList.queue(pose_node);

		//console.log('Begin Search!', graph);
		var nSearch = 0, nSearchMax = Math.pow(graph.edges.length, 2);
		do {
			graph.searchState = astar_step(graph);
			nSearch += 1;
			if (nSearch > nSearchMax) { break; }
		} while (graph.searchState === SEARCH_SEARCHING);
		//console.log('Done!', nSearch);

		var n = goal_node, path = [];
		while (n!==undefined) {
			path.push(n);
			n = graph.nodes[n.parent];
		}
		//console.log('Path', path);

		// Path from the start
		return path.reverse();
	}

	// Node Format:
	function make(polys, links){

		// Form the poly nodes
		// Assume always same # of leaves
		var nodes = polys.map(function(poly, id){
			//console.log(poly.parameters);
			return {
				edges : [/*IDs of edges*/],
				id: id,
				obj: poly,
				obj_tree : this.slice(),
			};
		}, polys[0].rho.map(function(){return -1;}));

		// Form the inter-poly links
		var edges = links.map(function(l, i){
			var edge = {id: i},
				a_poly_node = nodes[l.poly_a],
				b_poly_node = nodes[l.poly_b],
				a_node,
				b_node;
			// NOTE: Only calculate the cost on evaluation
			if(l.ind_a===-1){
				a_node = a_poly_node;
				edge.a = a_node.id;
				//edge.cost = 1;
			} else if(a_poly_node.obj_tree[l.ind_a] !== -1){
				edge.a = a_poly_node.obj_tree[l.ind_a];
				a_node = nodes[edge.a];
			} else {
				a_node = { edges: [], obj: a_poly_node.obj, obj_idx: l.ind_a };
				edge.a = a_poly_node.obj_tree[l.ind_a] = a_node.id = nodes.push(a_node) - 1;
			}
			if(l.ind_b===-1){
				b_node = b_poly_node;
				edge.b = b_node.id;
				//edge.cost = 1;
			} else if(b_poly_node.obj_tree[l.ind_b] !== -1){
				edge.b = b_poly_node.obj_tree[l.ind_b];
				b_node = nodes[edge.b];
			} else {
				b_node = { edges: [], obj: b_poly_node.obj, obj_idx: l.ind_b };
				edge.b = b_poly_node.obj_tree[l.ind_b] = b_node.id = nodes.push(b_node) - 1;
			}
			// Add the edge to the nodes
			a_node.edges.push(edge.id);
			b_node.edges.push(edge.id);
			return edge;
		});

		// Intra polygon edges
		polys.forEach(function(poly, ipoly){
			nodes[ipoly].obj_tree.forEach(function(node_id, iperim){
				if(node_id===-1){return;}
				var edge = {
					id: edges.length,
					a: ipoly,
					b: node_id,
				};
				edges.push(edge);
				// Add the edge to the nodes
				nodes[edge.a].edges.push(edge.id);
				nodes[edge.b].edges.push(edge.id);
			});
		});
		
		var graph = {
			nodes: nodes,
			edges: edges,
		};
		//console.log('Graph', graph);
		return graph;
	}

	function compare_expert_path(graph, traile, trailp, polys){
		console.log(trailp);
		console.log(traile);
		var good_ids = traile.map(function(t){return t[4];}),
			bad_ids = trailp.map(function(t){return t.id;});
		//console.log(good_ids);
//		/console.log(bad_ids);
		/*
		var minus1 = [];
		var plus1 = bad_ids.filter(function(id){
			if(good_ids.reduce(function(prev,now){return now===id||prev;}, false)){
				return true;
			};
			minus1.push(id);
			return false;
		});
		console.log(plus1, minus1);
		*/
		//avg good feature
		var good = good_ids.reduce(function(prev, id, arr){
			var n = graph.nodes[id];
			var f = n.obj.parameters ? n.obj.parameters.features : [0,0,0];
			return numeric.add( f, prev);
		}, [0,0,0]);
		numeric.div(good, good_ids.length);
		console.log(good);

		//avg bad feature
		var bad = bad_ids.reduce(function(prev, id, arr){
			var n = graph.nodes[id];
			var f = n.obj.parameters ? n.obj.parameters.features : [0,0,0];
			return numeric.add( f, prev);
		}, [0,0,0]);
		numeric.div(bad, bad_ids.length);
		console.log(bad);

		var alpha = 0.5; // learning rate
		var dir = numeric.sub(good, bad);
		var nm = numeric.norm(dir);
		var nw = numeric.div(dir, nm) * alpha;

	}

  ctx.Graph = {
		make : make,
		plan : plan,
		getEdgePairs : getEdgePairs,
		compare_expert_path: compare_expert_path,
  };

}(this));
