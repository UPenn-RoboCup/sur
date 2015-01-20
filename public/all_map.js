(function (ctx) {
	'use strict';
	// Private variables
	var d3 = ctx.d3,
    peer_id = 'all_map',
    peer_scene_id = 'all_scene',
    peer,
    p_conn,
    overlay,
		polyF = d3.svg.line()
			.x(function (d) { return d.x; })
			.y(function (d) { return d.y; })
    .interpolate("linear-closed");
  
  function debug(arr){
    d3.select("#info").html(arr.join('<br/>'));
  }
  
  function setup_rtc (){
    peer = new Peer(peer_id, {host: 'localhost', port: 9000});
    peer.on('open', function(id) {
      console.log('My peer ID is: ' + id);
      console.log('peer', peer);
    });
    peer.on('disconnected', function(conn) {
      console.log('disconnected');
    });
    peer.on('error', function(e) {
      console.log('error', e);
    });
    peer.on('close', function() {
      console.log('close');
    });
    p_conn = peer.connect(peer_scene_id);
    p_conn.on('open', function(){
      console.log('p_conn', p_conn);
      p_conn.send('hello from a map');
    });
    p_conn.on('close', function(){
      console.log('p_conn closed');
    });
    p_conn.on('data',function(data){
      console.log('scene data', data);
    });
  }
  
  function setup(){
    setup_rtc();
  	// Add the overlay
  	overlay = d3.select("#map_container").append("svg").attr('class', 'overlay');
//    .attr('viewBox', "0 0 256 212").attr('preserveAspectRatio', "none");
//  		.attr('width', depth_canvas.width).attr('height', depth_canvas.height);
  	var pose_g = overlay.append('g').attr('id', 'pose');
    var points = [{'x':-7,'y':10},{'x':0,'y':-10},{'x':7,'y':10}];
    pose_g.append("path")
  		.attr("d", polyF(points))
  		.attr("stroke", "red")
  		.attr("stroke-width", 2)
  		.attr("fill", "red")
      .attr("transform", "translate(" + 100 + "," + 100 + ")");
  }

	// Load the Styling
	ctx.util.lcss('/css/gh-buttons.css');
	ctx.util.lcss('/css/all_map.css', function () {
		d3.html('/view/all_map.html', function (error, view) {
			// Remove landing page elements and add new content
			d3.select("div#landing").remove();
			// Just see the scene
			document.body.appendChild(view);
      ctx.util.ljs('/js/peer.min.js', setup);
		});
	});
  
}(this));