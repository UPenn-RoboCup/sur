// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){

	// TODO: Dynamically load the image... there is no event to know it is done...
	var map = $('#map')[0];
	var w = 640, h=480;

	var pose_to_svg = function(pose){
		var inv_resolution = 20;
		var w = map.width, h=map.height;
		var y = pose[0] * inv_resolution + w/2;
		var x = pose[1] * inv_resolution + h/2;
		return [x,y];
	}


	var svg = d3.select("#map_overlay").append("svg")
      .attr("width", '100%')
      .attr("height", '100%');
	var x=0,y=0;
	svg.append("circle")
        .attr("class", "select")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 16)
        .style("fill", "red")
        .style("stroke", "blue")
        .style("stroke-width", 3)
	// Websocket Configuration for feedback
	var port = 9013;
	// Connect to the websocket server
	var ws = new WebSocket('ws://' + host + ':' + port);
	// Should not need this...
	ws.binaryType = "arraybuffer";
	ws.onmessage = function(e){
		//console.log(e);
		var feedback = JSON.parse(e.data);
		//console.log(feedback);
		var pose = feedback.pose;
		var circle = svg.selectAll("circle");
		//circle.data([pose]);
		var coord = pose_to_svg(pose);

		console.log(coord);
		circle.attr("cy", coord[0]);
		circle.attr("cx", coord[1]);
	};

});
