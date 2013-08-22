// Setup the WebSocket connection and callbacks
document.addEventListener( "DOMContentLoaded", function(){
  
  var update = function(e) {
    if(typeof e.data != "string"){ return; }
    var data    = JSON.parse(e.data)
    var recv_t  = e.timeStamp/1e6;
    var latency = recv_t - data.t
    //console.log('Spacemouse Latency: '+latency*1000+'ms')

    // update state
    var values = data.vals;
    if (data.evt == 'rotate') {
      // rotate
      update.wx = values.wx;
      update.wy = values.wy;
      update.wz = values.wz;
    } else if (data.evt == 'translate'){
      // translate
      update.x = values.x;
      update.y = values.y;
      update.z = values.z;
    } else {
      // button
      update.button = values;
    }
    
    /* Convert to a velocity */
    var put_url  = 'http://' + host + ':8080/mcm/walk/vel';
    var value    = [update.x/350,update.y/350,update.wz/350];
    var put_data = 'val='+JSON.stringify(value);
    $.ajax({
      type: "PUT",
      url:  put_url,
      data: put_data,
    });
  }
  
  // Configuration
  var port = 9003
  // Connect to the websocket server
  var ws = new WebSocket('ws://' + host + ':' + port);
  //fr_ws.binaryType = "arraybuffer";
  ws.binaryType = "blob";
  ws.open    = function(e) { console.log('connected!') }
  ws.onerror = function(e) { console.log('error',e) }
  ws.onclose = function(e) { console.log('close',e) }
  // Set the position and orientaiton of the object
  ws.onmessage = update;
  
}, false );