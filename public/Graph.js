(function (ctx) {
	'use strict';

	// Node Format:
	function make(nodes, edges){
		console.log('Nodes',nodes);
		console.log('Edges',edges);
	}

	// Needs d3 for now
	function plot(){

	}

  ctx.Graph = {
		make : make,
		plot : plot,
  };

}(this));
