(function (ctx) {
	'use strict';

	var arcF = d3.svg.line().x(function (d) { return d[0]; }).y(function (d) { return d[1]; }).interpolate("linear");

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
			var edge = {cost: 1, id: i},
				a_poly_node = nodes[l.poly_a],
				b_poly_node = nodes[l.poly_b],
				a_node,
				b_node;
			if(l.ind_a===-1){
				a_node = a_poly_node;
				edge.a = a_node.id;
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
			var node_a = nodes[edge.a],
				node_b = nodes[edge.b],
				p_a = node_a.obj_idx ? node_a.obj.perimeter[node_a.obj_idx] : node_a.obj.center,
				p_b = node_b.obj_idx ? node_b.obj.perimeter[node_b.obj_idx] : node_b.obj.center;
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
		plot : plot,
  };

}(this));
