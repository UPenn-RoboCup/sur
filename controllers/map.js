// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){

	// TODO: Dynamically load the image... there is no event to know it is done...
	var map = $('#map')[0];
	// Goal in world coordinates (meters)
	var goal = [0,0];
	var pose = [0,0];
	var svg = d3.select("#map_overlay").append("svg")
      .attr("width", '100%')
      .attr("height", '100%');

	// Make the pose marker
	svg.append("circle")
	.attr("class", "pose")
	.attr("id", "cur_pose")
	.attr("cx", 0)
	.attr("cy", 0)
	.attr("r", 16)
	.style("fill", "red")
	.style("stroke", "blue")
	.style("stroke-width", 3);

	// Make the goal marker
	var g_mark_w = 20, g_mark_h=20; //height/width of goal marker
	svg.append("rect")
	.attr("class", "goal")
	.attr("id", "cur_goal")
	.attr("width", g_mark_w)
	.attr("height", g_mark_h)
	.attr("x", -g_mark_w/2)
	.attr("y", -g_mark_w/2)
	.style("fill", "green")
	.style("stroke", "black")
	.style("stroke-width", 3);

	var pose_to_svg = function(pose){
		var inv_resolution = 20;
		var w = map.width, h=map.height;
		var y = pose[0] * inv_resolution + w/2;
		var x = pose[1] * inv_resolution + h/2;
		return [x,y];
	}

	addEventListener( 'resize', function(){
		var g = pose_to_svg(goal);
		svg.select('#cur_goal')
		.attr("x", g[1]-g_mark_w/2)
		.attr("y", g[0]-g_mark_w/2)
	});

	qwest.get( shm_url+'/wcm/map/goal' ).success(function(model){
		goal = model.slice();
		var g = pose_to_svg(goal)
		console.log('Goal',goal,g);
		svg.select('#cur_goal')
		.attr("x", g[1]-g_mark_w/2)
		.attr("y", g[0]-g_mark_w/2)
	});

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
		var coord = pose_to_svg(pose);
		var circle = svg.select("#cur_pose")
		.attr("cy", coord[0])
		.attr("cx", coord[1]);
	};

});
