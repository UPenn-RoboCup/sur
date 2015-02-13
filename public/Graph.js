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

	function get_pos(node){
		if(typeof node.obj_idx === 'number')
		{ return node.obj.perimeter[node.obj_idx]; }
		else if(node.obj_tree) { return node.obj.center; }
		else { return [node.obj.x, node.obj.y]; }
	}

	function dist(p){
		return sqrt(pow(this[0] - p[0], 2) + pow(this[1] - p[1], 2));
	}
	function smallest(prev, now, inow){
		return now < prev[0] ? [now, inow] : prev;
	}
	var heuristic = function(n, goal){
		dist.call(n, goal);
	}

	function astar_step(graph){
		var edges = graph.edges,
			nodes = graph.nodes,
			openList = graph.openList,
			searchState = graph.searchState,
			goal_index = graph.goal_index,
			goal = nodes[goal_index];

		if (searchState != SEARCH_SEARCHING) {
			console.log('Not searching!');
			return searchState;
		}

		if (openList.length==0) {
			console.log('Nothing in the list!');
			searchState = SEARCH_FAILED;
			return searchState;
		}

		// Grab the next node to explore
		// Objects, not addresses, are in the queue
		var n = openList.dequeue();
		n.state = NODE_CLOSED;

		// Check for the goal
		if (n.id == goal_index) {
			console.log('Done searching!');
			searchState = SEARCH_SUCCESS;
			return searchState;
		}

		// Current node popped from open list is not goal
		n.edges.forEach(function(e_id){
			var e = edges[e_id],
				gnew = e.cost + this.cost,
				target_index = e.a==n.id ? e.b : e.a,
				target_node = nodes[target_index];
			if(target_node.g) console.log(gnew, target_node.g);
			if (target_node.h===undefined) {
				// Evaluate the heuristic if not done yet
				target_node.h = dist.call(goal.p, target_node.p);
				target_node.g = gnew;
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
				// Node changed on open list: need to resort open list
				openList.priv._heapify();
				//console.log('openList len', openList.length);
			}
		}, n);
		searchState = SEARCH_SEARCHING;
		//console.log('Peek', openList.peek(), openList.length);
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
		polys.map(function(poly, id){
			var closest = poly.perimeter.map(dist, pose_xy).reduce(smallest, [Infinity, -1]),
				id_close = closest[1],
				id_node = graph.nodes[id].obj_tree[id_close];
			if(id_node==-1){
				var closest_node = graph.nodes[id].obj_tree[id_close] = {
					edges: [], obj: poly, obj_idx: id_close
				};
				id_node = closest_node.id = graph.nodes.push(closest_node) - 1;
			}
			return { /*cost: closest[0],*/ a: pose_node.id, b: id_node };
		}, graph).forEach(function(e){
			e.id = graph.edges.push(e) - 1;
			//console.log('start edges', e);
			var n_a = graph.nodes[e.a], n_b = graph.nodes[e.b];
			n_a.edges.push(e.id);
			n_b.edges.push(e.id);
		});

		// Same for goal
		var goal_xy = [goal.x, goal.y],
			goal_node = { cost: 0, edges : [], obj: goal };
		goal_node.id = graph.nodes.push(goal_node) - 1;
		// Add to the graph
		polys.map(function(poly, id){
			var closest = poly.perimeter.map(dist, goal_xy).reduce(smallest, [Infinity, -1]),
				id_close = closest[1],
				id_node = graph.nodes[id].obj_tree[id_close];
			if(id_node==-1){
				var closest_node = graph.nodes[id].obj_tree[id_close] = {
					edges: [], obj: poly, obj_idx: id_close
				};
				id_node = closest_node.id = graph.nodes.push(closest_node) - 1;
			}
			return { /*cost: closest[0],*/ a: goal_node.id, b: id_node };
		}, graph).forEach(function(e){
			e.id = graph.edges.push(e) - 1;
			//console.log('goal edges', e);
			var n_a = graph.nodes[e.a], n_b = graph.nodes[e.b];
			n_a.edges.push(e.id);
			n_b.edges.push(e.id);
		});


		// Set the pqueue
		graph.searchState = SEARCH_SEARCHING;
		graph.openList = new PriorityQueue({
			comparator: function(a, b) { return a.f - b.f; }
		});
		graph.openList.queue(pose_node);
		graph.goal_index = goal_node.id;
		// Easy access to the heuristic argument
		graph.nodes.forEach(function(n){
			n.p = get_pos(n);
			n.cost = n.cost || dist.call(n.p, goal_xy);
		});
		// Edge cost
		graph.edges.forEach(function(e){
			e.cost = e.cost || 0;
		});

		console.log('Begin Search!', graph);
		var nSearch = 0, nSearchMax = pow(graph.edges.length, 2);
		do {
			graph.searchState = astar_step(graph);
			nSearch += 1;
			if (nSearch > nSearchMax) break;
		} while (graph.searchState == SEARCH_SEARCHING);
		console.log('Done!', nSearch);
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
				edge.b = b_poly_node.ID;
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
		console.log('Graph', graph);
		return graph;
	}

	// Needs d3 for now
	function plot(graph, group){
		var nodes = graph.nodes, edges = graph.edges;
		// return the link
		var links = edges.map(function(edge){
			var node_a = nodes[edge.a], node_b = nodes[edge.b],
				p_a, p_b;

			if(typeof node_a.obj_idx === 'number'){
				p_a = node_a.obj.perimeter[node_a.obj_idx];
			}
			else if(node_a.obj_tree) { p_a = node_a.obj.center; }
			else { p_a = [node_a.obj.x, node_a.obj.y]; }

			if(typeof node_b.obj_idx === 'number'){
				p_b = node_b.obj.perimeter[node_b.obj_idx];
			}
			else if(node_b.obj_tree) { p_b = node_b.obj.center; }
			else { p_b = [node_b.obj.x, node_b.obj.y]; }

			return [p_a, p_b];
		});
		// Draw the links
		links.forEach(function(l){
			group.append("path").attr('class','arc').attr("d", arcF([l[0], l[1]]));
		});
		return links;
	}

  ctx.Graph = {
		make : make,
		plan : plan,
		plot : plot,
  };

}(this));
