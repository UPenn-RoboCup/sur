// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  // Set up the camera
  Camera.setup();
  
  // Place on the page
  var camera_container = $('#camera_container')[0];
  var img = Camera.get_image();
  camera_container.appendChild( img );
  
  // Normalized Device Coordinates
  var get_coord = function(event){
    var width = camera_container.clientWidth;
    var height = camera_container.clientHeight;
    var dx = event.offsetX || event.clientX;
    var dy = event.offsetY || event.clientY;
    return {
      ndx: dx/width,
      ndy: 1-dy/height
    };
  }
  
  // Data sharing
  var is_connected = false;
  var peer = new Peer('cameras', {host: 'localhost', port: 9000});
  // Check if we have the peer available
  if(peer.id!=null){
    var meshy_conn = peer.connect('meshy');
    meshy_conn.on('open', function(conn){
      console.log('Peer | meshy!!!');
      is_connected = true;
    });
    meshy_conn.on('close', function(conn){
      console.log('Peer | meshy offline');
      is_connected = false;
    });
  }
  
  // Single click looks somewhere
  var hammertime = Hammer(camera_container);
  hammertime.on("tap", function(e){
    var event = e.gesture.touches[0];
    var coord = get_coord(event);
    console.log('Clicked',coord);
    coord.evt = 'camera_click';
    if(is_connected){
      meshy_conn.send( coord );
    } else {
      Transform.head_look(coord);
    }
  });
  
  // Head movement
  var ang_url = rest_root+'/m/hcm/motion/headangle';
  clicker('head_ahead',function(){
    qwest.post(ang_url,{val: JSON.stringify([0,0])});
  })
  
});