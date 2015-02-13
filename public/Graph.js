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
		round = Math.round;

	function dist2(p){
		return pow(this[0] - p[0], 2) + pow(this[1] - p[1], 2);
	}
	function smallest(prev, now, inow){
		return now < prev[0] ? [now, inow] : prev;
	}

	function plan(polys, graph, pose, goal) {
		// Find the path to each free space
		// TODO: Check the obstruction
		// Distances in unknown have distance cost, distances in green have finite small cost

		var pose_xy = [pose.x, pose.y];

		// Add start node
		var pose_node = { cost: 1, edges : [], obj: pose };
		pose_node.id = graph.nodes.push(pose_node) - 1;
		// Add to the graph
		polys.map(function(poly, id){
			var closest = poly.perimeter.map(dist2, pose_xy).reduce(smallest, [Infinity, -1]),
				id_close = closest[1],
				id_node = graph.nodes[id].obj_tree[id_close],
				closest_node;
			console.log('Closest',closest);
			if(id_node==-1){
				var closest_node = graph.nodes[id].obj_tree[id_close] = {
					cost: 1, edges: [], obj: poly, obj_idx: id_close
				};
				id_node = closest_node.id = graph.nodes.push(closest_node) - 1;
			}
			return {
				cost: closest[0],
				a: pose_node.id,
				b: id_node
			}
		}, graph).forEach(function(e){
			e.id = graph.edges.push(e) - 1;
		});

	}

	// Node Format:
	function make(polys, links){

		// Form the poly nodes
		// Assume always same # of leaves
		var nodes = polys.map(function(poly, id){
			return {
				cost: 1,
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
				edge.cost = 1;
			} else if(a_poly_node.obj_tree[l.ind_a] !== -1){
				edge.a = a_poly_node.obj_tree[l.ind_a];
				a_node = nodes[edge.a];
			} else {
				a_node = { cost: 1, edges: [], obj: a_poly_node.obj, obj_idx: l.ind_a };
				edge.a = a_poly_node.obj_tree[l.ind_a] = a_node.id = nodes.push(a_node) - 1;
			}
			if(l.ind_b===-1){
				b_node = b_poly_node;
				edge.b = b_poly_node.ID;
				edge.cost = 1;
			} else if(b_poly_node.obj_tree[l.ind_b] !== -1){
				edge.b = b_poly_node.obj_tree[l.ind_b];
				b_node = nodes[edge.b];
			} else {
				b_node = { cost: 1, edges: [], obj: b_poly_node.obj, obj_idx: l.ind_b };
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
