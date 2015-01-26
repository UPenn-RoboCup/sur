(function (ctx) {
	'use strict';
	// Private variables
	var d3 = ctx.d3,
    peer_id = 'all_map',
    peer_scene_id = 'all_scene',
    peer,
    p_conn,
    overlay,
    map_c,
    adjacency_matrix = [];
  
  var polyF = d3.svg.line().x(function (d) { return d.x; }).y(function (d) { return d.y; }).interpolate("linear-closed");
  
  function debug(arr){
    d3.select("#info").html(arr.join('<br/>'));
  }
  
  var add_map = {
    cyl: function (params){
    	overlay.append("circle")
    		.attr("cx", params.xc / -1000)
    		.attr("cy", params.zc / -1000)
        .attr("r", params.r / 1000)
        .attr('class', 'obstascle');
    },
    // horiz plane
    h: function (params){
      console.log(params);
      var patch = overlay.append("path")
    		.attr("d", polyF(params.perimeter))
        .attr("transform", "translate(" + 0 + "," + 0 + ")");
      // Color correctly
      if (params.features[0] > 20){
        patch.attr('class', 'flat');
      } else {
        patch.attr('class', 'step');
      }
      //
    },
    // vertical plane
    v: function (params){
      console.log(params);
      overlay.append("path")
    		.attr("d", polyF(params.endpoints))
        .attr("transform", "translate(" + 0 + "," + 0 + ")")
        .attr('class', 'wall');
    },
  };
  
  var add_graph = {
    h: function(params){
      console.log(params);
      adjacency_matrix.forEach(function(){
        
      });
    }
  };
  
  function setup_rtc (){
    peer = new Peer(peer_id, {host: 'localhost', port: 9000});
    peer.on('open', function(id) { console.log('My peer ID is: ' + id); });
    peer.on('disconnected', function(conn) { console.log('disconnected'); });
    peer.on('error', function(e) { console.log('error', e); });
    peer.on('close', function() { console.log('close'); });
    p_conn = peer.connect(peer_scene_id);
    p_conn.on('open', function(){ p_conn.send('hello from a map'); });
    p_conn.on('close', function(){ console.log('p_conn closed'); });
    p_conn.on('data',function(data){
      console.log('scene data', data);
      var f_map = add_map[data.id];
      if(typeof f_map === 'function'){ f_map(data); }
      var f_graph = add_graph[data.id];
      if(typeof f_map === 'function'){ f_map(data); }
    });
  }

  function setup(){
    setup_rtc();
    map_c = d3.select('#map_container').node();
  	// Add the overlay
  	overlay = d3.select("#map_container").append("svg").attr('class', 'overlay')
    .attr('viewBox', "-3 -3 6 6").attr('preserveAspectRatio', "none")
    .attr('width', map_c.clientWidth).attr('height', map_c.clientHeight);
    var points = [/*tip*/{'x':0,'y':0}, {'x':-0.05,'y':0.25},{'x':0.05,'y':0.25}];
    overlay.append("path")
  		.attr("d", polyF(points))
  		.attr("stroke", "red")
  		.attr("stroke-width", 0.01)
  		.attr("fill", "none")
      .attr("transform", "translate(" + 0 + "," + 0 + ")")
      .attr('id', 'pose');
  }
  
	// Handle resizing
	window.addEventListener('resize', function () {
    overlay.attr('width', map_c.clientWidth).attr('height', map_c.clientHeight);
	}, false);

	// Load the Styling
	ctx.util.lcss('/css/gh-buttons.css');
	ctx.util.lcss('/css/all_map.css', function () {
		d3.html('/view/all_map.html', function (error, view) {
			// Remove landing page elements and add new content
			d3.select("div#landing").remove();
			// Just see the scene
			document.body.appendChild(view);
      window.setTimeout(setup,0 );
		});
	});
  
}(this));