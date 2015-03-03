(function (ctx) {
	'use strict';

	var arcF = d3.svg.line().x(function (d) { return d[0]; }).y(function (d) { return d[1]; }).interpolate("linear");

	var pow = Math.pow,
		abs = Math.abs,
		sqrt = Math.sqrt,
		exp = Math.exp,
		min = Math.min,
		max = Math.max,
		PI = Math.PI,
		TWO_PI = 2*PI,
		atan = Math.atan,
		atan2 = Math.atan2,
		sin = Math.sin,
		cos = Math.cos,
		floor = Math.floor,
		ceil = Math.ceil,
		round = Math.round,
		SEARCH_UNDEFINED = 0,
		SEARCH_SEARCHING = 1,
		SEARCH_SUCCESS = 2,
		SEARCH_FAILED = 3,
		NODE_OPEN = 0,
		NODE_CLOSED = 1;

		// Returns: [x, y, poly idx, perimeter index]
	function node2point(node){
		if(typeof node.obj_idx === 'number'){
			return node.obj.perimeter[node.obj_idx].concat([node.obj.id, node.obj_idx]);
		} else if(node.obj_tree) {
			return node.obj.center.concat([node.obj.id, -1]);
		} else {
			// Start or goal... TBD
			return [node.obj.x, node.obj.y, -1, -1];
		}
	}
	function dist(p){
		return sqrt(pow(this[0] - p[0], 2) + pow(this[1] - p[1], 2));
	}
	function smallest(prev, now, inow){
		return now < prev[0] ? [now, inow] : prev;
	}
	// Needs d3 for now
	function getEdgePairs(graph){
		return graph.edges.map(function(edge){
			return [node2point(this[edge.a]), node2point(this[edge.b])];
		}, graph.nodes);
	}

	function astar_step(graph){
		var edges = graph.edges,
			nodes = graph.nodes,
			openList = graph.openList,
			searchState = graph.searchState,
			goal_index = graph.goal_index,
			goal = nodes[goal_index];

		if (searchState != SEARCH_SEARCHING) {
			return searchState;
		}

		if (openList.length==0) {
			searchState = SEARCH_FAILED;
			return searchState;
		}

		// Grab the next node to explore
		// Objects, not addresses, are in the queue
		var n = openList.dequeue();
		n.state = NODE_CLOSED;

		// Check for the goal
		if (n.id == goal_index) {
			searchState = SEARCH_SUCCESS;
			return searchState;
		}

		// Current node popped from open list is not goal
		n.edges.forEach(function(e_id){
			var e = edges[e_id],
				target_index = e.a==this.id ? e.b : e.a,
				target_node = nodes[target_index],
				gnew = this.g + e.cost + target_node.cost;
			if (target_node.h===undefined) {
				// Evaluate the heuristic if not done yet
				target_node.g = gnew + target_node.cost;
				target_node.h = dist.call(goal.p, target_node.p);
				target_node.f = target_node.g + target_node.h;
				target_node.parent = this.id;
				target_node.state = NODE_OPEN;
				openList.queue(target_node);
			} else if (gnew < target_node.g) {
				target_node.g = gnew;
				target_node.f = target_node.g + target_node.h;
				target_node.parent = this.id;
				if (target_node.state == NODE_CLOSED) {
					target_node.state = NODE_OPEN;
					openList.queue(target_node);
				}
			}	else {
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
		polys.forEach(function(poly, id){
			var closest = poly.perimeter.map(dist, pose_xy).reduce(smallest, [Infinity, -1]),
				id_close = closest[1],
				id_node = graph.nodes[id].obj_tree[id_close];
			
			// Check for breakage
			var is_broken = polys.map(function(polyO, ipolyO){
				if(ipolyO==id){return false;}
				var a = pose_xy, b = poly.perimeter[id_close], dAB = dist.call(a, b);
				if(dAB>1){ return true; }
				return Classify.breaks.call(polyO, a, b);
			}).reduce(function(prev, now){return prev || now});
			// dont add
			if(is_broken){ return; }
			
			if(id_node==-1){
				// node does not exist yet
				var closest_node = graph.nodes[id].obj_tree[id_close] = {
					edges: [], obj: poly, obj_idx: id_close
				};
				id_node = closest_node.id = graph.nodes.push(closest_node) - 1;
			}

			var e = { cost: closest[0], a: pose_node.id, b: id_node };
			e.id = graph.edges.push(e) - 1;
			var n_a = graph.nodes[e.a], n_b = graph.nodes[e.b];
			n_a.edges.push(e.id);
			n_b.edges.push(e.id);

			// NEED TO CONNECT PERIMETER TO THE CENTER
			// TODO: Check if this link already exists!
			var e_poly_direct = {a: id_node, b: id, cost: 0 };
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
			var closest = poly.perimeter.map(dist, goal_xy).reduce(smallest, [Infinity, -1]),
				id_close = closest[1],
				id_node = graph.nodes[id].obj_tree[id_close];
			
			// Check for breakage
			var is_broken = polys.map(function(polyO, ipolyO){
				if(ipolyO==id){return false;}
				var a = goal_xy, b = poly.perimeter[id_close], dAB = dist.call(a, b);
				if(dAB>1){ return true; }
				return Classify.breaks.call(polyO, a, b);
			}).reduce(function(prev, now){return prev || now});
			// dont add
			if(is_broken){ return; }
			
			if(id_node==-1){
				var closest_node = graph.nodes[id].obj_tree[id_close] = {
					edges: [], obj: poly, obj_idx: id_close
				};
				id_node = closest_node.id = graph.nodes.push(closest_node) - 1;
			}

			// NEED TO CONNECT PERIMETER TO THE CENTER
			// TODO: Check if this link already exists!
			var e_poly_direct = {a: id_node, b: id, cost: 0 };
			e_poly_direct.id = graph.edges.push(e_poly_direct) - 1;
			graph.nodes[id].edges.push(e_poly_direct.id);
			graph.nodes[id_node].edges.push(e_poly_direct.id);

			var e = { cost: closest[0], a: goal_node.id, b: id_node };
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
			if(n.cost===undefined){
				n.cost = 1;
			}
		});
		// Edge cost
		graph.edges.forEach(function(e){
			if(typeof e.cost!=='number'){
				e.cost = dist.call(graph.nodes[e.a].p, graph.nodes[e.b].p);
			}
		});

		pose_node.g = 0;
		pose_node.h = dist.call(goal_node.p, pose_node.p);
		pose_node.f = pose_node.g + pose_node.h;
		//pose_node.parent = 0;
		pose_node.state = NODE_OPEN;
		graph.openList.queue(pose_node);

		//console.log('Begin Search!', graph);
		var nSearch = 0, nSearchMax = pow(graph.edges.length, 2);
		do {
			graph.searchState = astar_step(graph);
			nSearch += 1;
			if (nSearch > nSearchMax) break;
		} while (graph.searchState == SEARCH_SEARCHING);
		//console.log('Done!', nSearch);

		var n = goal_node, path = [];
		while (n!==undefined) {
			path.push(n);
			n = graph.nodes[n.parent];
		}
		//console.log('Path', path);

		// Path from the start
		return path.map(function(p){return p.p;}).reverse();
	}

	// Node Format:
	function make(polys, links){

		// Form the poly nodes
		// Assume always same # of leaves
		var nodes = polys.map(function(poly, id){
			return {
				edges : [/*IDs of edges*/],
				id: id,
				obj: poly,
				obj_tree : this.slice(),
			}
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

		var graph = {
			nodes: nodes,
			edges: edges,
		};
		//console.log('Graph', graph);
		return graph;
	}

  ctx.Graph = {
		make : make,
		plan : plan,
		getEdgePairs : getEdgePairs,
  };

}(this));
