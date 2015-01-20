(function (ctx) {
	'use strict';
	// Private variables
	var d3 = ctx.d3,
    peer_id = 'all_map',
    peer_scene_id = 'all_scene',
    peer,
    p_conn;
  
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