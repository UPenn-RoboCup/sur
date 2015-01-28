(function (ctx) {
	'use strict';
	// Private variables
	var d3 = ctx.d3,
		debug = ctx.util.debug,
		DEG_TO_RAD = ctx.util.DEG_TO_RAD,
		RAD_TO_DEG = ctx.util.RAD_TO_DEG,
    peer_id = 'all_map',
    peer_scene_id = 'all_scene',
		logname = 'hmap1422420587688',//'hmap1422420587688',//'hmap1422420624071',
    peer,
    p_conn,
    overlay,
		pose_marker,
    map_c,
		human = [],
		polys = [];
	var polyF = d3.svg.line().x(function (d) { return d.x; }).y(function (d) { return d.y; }).interpolate("linear-closed");
	var arcF = d3.svg.line().x(function (d) { return d[0]; }).y(function (d) { return d[1]; }).interpolate("linear");

	function local2global(v){ return [v.x+this[0], v.y+this[1]]; }
	function get_wrapped_indices(start, stop, max){
		var indices = [];
		for(var i=start; i<=stop; i+=1){
			if(i<0){
				indices.push(max+i);
			} else if(i>=max) {
				indices.push(i-max);
			} else {
				indices.push(i);
			}
		}
		return indices;
	}

	var add_graph = {
		h: function(params){
			var perimeterNodes = params.projected.xy.map(local2global, params.projected.root);
			// Half plane angle
			var halfplane_indices = polys.map(function(v){
				var nChunks = this.xy.length;
				var my_angle = Math.atan2(-v.center[0]+this.root[0], -v.center[1]+this.root[1]);
				var my_idx = Math.floor(my_angle*nChunks/(2*Math.PI)+nChunks/2);
				var their_angle = my_angle > 0 ? my_angle-Math.PI : my_angle + Math.PI;
				var their_idx = Math.floor(their_angle*nChunks/(2*Math.PI)+nChunks/2);
				return [
					get_wrapped_indices(my_idx-nChunks/4, my_idx+nChunks/4, nChunks),
					get_wrapped_indices(their_idx-nChunks/4, their_idx+nChunks/4, nChunks)
					//[my_idx],
					//[their_idx]
				];
			}, params.projected);
			// Draw it
			polys.forEach(function(poly, i){
				var my_arc = halfplane_indices[i][0].map(function(idx){ return perimeterNodes[idx];});
				var their_arc = halfplane_indices[i][1].map(function(idx){ return poly.perimeter[idx];});
				//overlay.append("path").attr('class','arc').attr("d", arcF(my_arc));
				overlay.append('g').attr('class', 'marker').selectAll('path')
				.data(my_arc).enter()
				.append("path").attr('class', 'arc')
				.attr("d", d3.svg.symbol().type("circle").size(0.002))
				.attr("transform", function(d) { return "translate(" + d[0] + "," + d[1] + ")"; });
				//overlay.append("path").attr('class','arc').attr("d", arcF(their_arc));
				overlay.append('g').attr('class', 'marker').selectAll('path')
				.data(their_arc).enter()
				.append("path").attr('class', 'arc')
				.attr("d", d3.svg.symbol().type("circle").size(0.002))
				.attr("transform", function(d) { return "translate(" + d[0] + "," + d[1] + ")"; });
			});



			// Push the added one

			polys.push({
				center : params.projected.root,
				perimeter: perimeterNodes
			});
		}
	};

	function parse_param(data){
		console.log(data);
		var f_map = add_map[data.id], f_graph = add_graph[data.id];
		if(typeof f_map === 'function'){ f_map(data); }
		if(typeof f_graph === 'function'){ f_graph(data); }
		// Save the data we received
		human.push(data);
	}

	function open(){
		d3.text('/logs/'+logname+'.json').get(function(e,data){
			if (e) {
				console.log('Could not open log',e);
			} else {
				debug(['Loaded ' + logname]);
				JSON.parse(data).forEach(parse_param);
			}
		});
	}

	function save(){
		var name = 'hmap' + Date.now(), data = JSON.stringify(human);
		debug(['Saving ' + name, data.length + ' bytes']);
		d3.text('/log/'+name).post(data, function(e,d){
			if (e) { console.log('Could not save', e); }
		});
	}

  var add_map = {
    cyl: function (params){
    	overlay.append("circle")
    		.attr("cx", params.xc / -1000)
    		.attr("cy", params.zc / -1000)
        .attr("r", params.r / 1000)
        .attr('class', 'obstacle');
    },
    // horiz plane
    h: function (params){
      var patch = overlay.append("path")
    		.attr("d", polyF(params.projected.xy))
        .attr("transform", "translate(" + params.projected.root[0] + "," + params.projected.root[1] + ")");
      // Color correctly
      if (params.features[0] > 20){
        patch.attr('class', 'flat');
      } else {
        patch.attr('class', 'step');
      }
			overlay.append("circle")
				.attr("cx", params.projected.root[0])
				.attr("cy", params.projected.root[1])
				.attr("r", 0.02);
    },
    // vertical plane
    v: function (params){
      overlay.append("path")
    		.attr("d", polyF(params.endpoints))
        .attr("transform", "translate(" + 0 + "," + 0 + ")")
        .attr('class', 'wall');
    },
  };

  function setup_rtc (){
    peer = new Peer(peer_id, {host: 'localhost', port: 9000});
    peer.on('open', function(id) { console.log('My peer ID is: ' + id); });
    peer.on('disconnected', function(conn) { console.log('disconnected'); });
    //peer.on('error', function(e) {console.log('error', e);});
    peer.on('close', function() { console.log('close'); });
    p_conn = peer.connect(peer_scene_id);
    p_conn.on('open', function(){ p_conn.send('hello from a map'); });
    p_conn.on('close', function(){ console.log('p_conn closed'); });
    p_conn.on('data', parse_param);
  }

	// Add the robot marker
	function draw_pose(pose){
		if(pose_marker===undefined){
			pose_marker = overlay.append("path")
				.attr('id', 'pose')
				.attr("d", polyF([
					{'x':0,'y':0}, // tip of the triangle
					{'x':-0.05,'y':0.25},
					{'x':0.05,'y':0.25}])
				);
		} else {
			pose_marker.attr("transform", "translate(" + -pose.y + "," + -pose.x + ")");
		}
	}

  function setup_dom(){
    map_c = d3.select('#map_container').node();
  	// Add the overlay
  	overlay = d3.select("#map_container").append("svg").attr('class', 'overlay')
	    .attr('viewBox', "-3 -3 6 6").attr('preserveAspectRatio', "none")
	    .attr('width', map_c.clientWidth).attr('height', map_c.clientHeight);
		// Allow saving
		d3.select('button#save').on('click', save);
		d3.select('button#open').on('click', open);
		// Draw the robot icon
		window.setTimeout(draw_pose, 0);
		// Connect with the peer
		window.setTimeout(setup_rtc, 0);
		// Open logs
		window.setTimeout(open, 0);
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
			document.body.appendChild(view);
      window.setTimeout(setup_dom, 0);
		});
	});

}(this));
