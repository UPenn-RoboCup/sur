this.addEventListener("load", function () {
	
	// Grab the body element
	var $ = this.$,
		d3 = this.d3,
		b = $('body')[0],
		svg = d3.select("#full")
			.attr("class", "full")
			.attr("class", "overlay")
			.attr("width", '100%')
			.attr("height", '100%'),
		svg_container = svg[0][0];

	get_pix = function(id,prop){
		var dom = $('#'+id)[0];
		var sty = getComputedStyle(dom);
		return parseFloat(sty[prop].slice(0,-2));
	}
	var get_center = function(id){
		var w = get_pix(id,'width') + get_pix(id,'padding-left') + get_pix(id,'padding-right');
		var h = get_pix(id,'height') + get_pix(id,'padding-bottom') + get_pix(id,'padding-top');
		return {
			x: get_pix(id,'left') + w / 2,
			y: get_pix(id,'top') + h / 2,
		}
	}
	var north = function(id){
		var w = get_pix(id,'width') + get_pix(id,'padding-left') + get_pix(id,'padding-right');
		return {
			x: get_pix(id,'left') + w / 2,
			y: get_pix(id,'top'),
		}
	}
	var south = function(id){
		var w = get_pix(id,'width') + get_pix(id,'padding-left') + get_pix(id,'padding-right');
		var h = get_pix(id,'height') + get_pix(id,'padding-bottom') + get_pix(id,'padding-top');
		return {
			x: get_pix(id,'left') + w / 2,
			y: get_pix(id,'top') + h,
		}
	}
	var west = function(id){
		var h = get_pix(id,'width') + get_pix(id,'padding-bottom') + get_pix(id,'padding-bottom');
		return {
			x: get_pix(id,'left'),
			y: get_pix(id,'top') + h / 2,
		}
	}
	var east = function(id){
		var w = get_pix(id,'width') + get_pix(id,'padding-left') + get_pix(id,'padding-right');
		var h = get_pix(id,'height') + get_pix(id,'padding-bottom') + get_pix(id,'padding-top');
		return {
			x: get_pix(id,'left') + w,
			y: get_pix(id,'top') + h / 2,
		}
	}
	var northeast = function(id){
		var w = get_pix(id,'width') + get_pix(id,'padding-left') + get_pix(id,'padding-right');
		return {
			x: get_pix(id,'left') + w,
			y: get_pix(id,'top'),
		}
	}
	var northwest = function(id){
		return {
			x: get_pix(id,'left'),
			y: get_pix(id,'top'),
		}
	}
	var southeast = function(id){
		var w = get_pix(id,'width') + get_pix(id,'padding-left') + get_pix(id,'padding-right');
		var h = get_pix(id,'height') + get_pix(id,'padding-bottom') + get_pix(id,'padding-top');
		return {
			x: get_pix(id,'left') + w,
			y: get_pix(id,'top') + h,
		}
	}
	var southwest = function(id){
		var h = get_pix(id,'height') + get_pix(id,'padding-bottom') + get_pix(id,'padding-top');
		return {
			x: get_pix(id,'left'),
			y: get_pix(id,'top') + h,
		}
	}
	var add_radio = function(id){
		var ne = northeast(id);
		// Broadcast
		var radio0 = d3.svg.arc()
			.innerRadius(4)
			.outerRadius(6)
			.startAngle(0)
			.endAngle(Math.PI/2);
		var radio1 = d3.svg.arc()
			.innerRadius(8)
			.outerRadius(10)
			.startAngle(0)
			.endAngle(Math.PI/2);
		var radio2 = d3.svg.arc()
			.innerRadius(12)
			.outerRadius(14)
			.startAngle(0)
			.endAngle(Math.PI/2);
		var radio = svg.append('g')
			.attr("transform","translate("+ne.x+","+ne.y+")");
		radio.append("svg:path")
			.attr("d",radio0);
		radio.append("svg:path")
			.attr("d",radio1);
		radio.append("svg:path")
			.attr("d",radio2);
		return radio;
	}
	// Specify the generators
	var connect = d3.svg.line()
		.x(function(d){return d.x;})
		.y(function(d){return d.y;})
		.interpolate("linear"); 
	svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("refX", 6) /*must be smarter way to calculate shift*/
    .attr("refY", 2)
    .attr("markerWidth", 6)
    .attr("markerHeight", 4)
    .attr("orient", "auto")
    .append("path")
		.attr("d", "M 0,0 V 4 L6,2 Z"); //this is actual shape for arrowhead
	
	// lidar to mesh
	svg.append("svg:path")
		.style("stroke-width", 2)
		.style("stroke", "steelblue")
		.style("fill", "none")
		.attr("marker-end", "url(#arrowhead)")
		.attr("d", connect([south('lidar'),north('mesh')]));
	// rpc audio
	svg.append("svg:path")
		.style("stroke-width", 2)
		.style("stroke", "steelblue")
		.style("fill", "none")
		.attr("marker-end", "url(#arrowhead)")
		.attr("d", connect([west('rpc'),east('audio')]));
	// rpc camera
	svg.append("svg:path")
		.style("stroke-width", 2)
		.style("stroke", "steelblue")
		.style("fill", "none")
		.attr("marker-end", "url(#arrowhead)")
		.attr("d", connect([west('rpc'),east('camera2')]));
	// rpc mesh
	svg.append("svg:path")
		.style("stroke-width", 2)
		.style("stroke", "steelblue")
		.style("fill", "none")
		.attr("marker-end", "url(#arrowhead)")
		.attr("d", connect([west('rpc'),east('mesh')]));
	// rpc state
	svg.append("svg:path")
		.style("stroke-width", 2)
		.style("stroke", "steelblue")
		.style("fill", "none")
		.attr("marker-end", "url(#arrowhead)")
		.attr("d", connect([south('rpc'),northwest('state')]));
	svg.append("svg:path")
		.style("stroke-width", 2)
		.style("stroke", "steelblue")
		.style("fill", "none")
		.attr("marker-end", "url(#arrowhead)")
		.attr("d", connect([east('rpc'),northwest('nodejs')]));
	svg.append("svg:path")
		.style("stroke-width", 2)
		.style("stroke", "steelblue")
		.style("fill", "none")
		.attr("marker-end", "url(#arrowhead)")
		.attr("d", connect([southwest('nodejs'),southeast('rpc')]));
	svg.append("svg:path")
		.style("stroke-width", 2)
		.style("stroke", "steelblue")
		.style("fill", "none")
		.attr("marker-end", "url(#arrowhead)")
		.attr("d", connect([northeast('nodejs'),west('browser')]));
	svg.append("svg:path")
		.style("stroke-width", 2)
		.style("stroke", "steelblue")
		.style("fill", "none")
		.attr("marker-end", "url(#arrowhead)")
		.attr("d", connect([southwest('browser'),southeast('nodejs')]));
	
	// Broadcast
	add_radio('camera2');
	add_radio('audio');
	add_radio('mesh');
	add_radio('rpc');
	//(function(){
	var sn = south('nodejs');
	sn.y+=20;
		// Broadcast
		var radio0 = d3.svg.arc()
			.innerRadius(4)
			.outerRadius(6)
			.startAngle(-Math.PI/4)
			.endAngle(Math.PI/4);
		var radio1 = d3.svg.arc()
			.innerRadius(8)
			.outerRadius(10)
			.startAngle(-Math.PI/4)
			.endAngle(Math.PI/4);
		var radio2 = d3.svg.arc()
			.innerRadius(12)
			.outerRadius(14)
			.startAngle(-Math.PI/4)
			.endAngle(Math.PI/4);
		var radio = svg.append('g')
			.attr("transform","translate("+sn.x+","+sn.y+")");
		radio.append("svg:path")
			.attr("d",radio0);
		radio.append("svg:path")
			.attr("d",radio1);
		radio.append("svg:path")
			.attr("d",radio2);
	//})();
	
}); // Page load listener