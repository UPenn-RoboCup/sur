// Setup the WebSocket connection and callbacks
document.addEventListener( "DOMContentLoaded", function(){
  
  // Configuration
  var port = 9003

  // Connect to the websocket server
  var ws = new WebSocket('ws://' + host + ':' + port);
  //fr_ws.binaryType = "arraybuffer";
  ws.binaryType = "blob";
  
  ws.open = function(e){
    console.log('connected!')
  }
  ws.onerror = function(e) {
    console.log('error',e)
  }
  ws.onclose = function(e) {
    console.log('close',e)
  }
	
  // Set the position and orientaiton of the object
  ws.onmessage = function(e){
    if(typeof e.data != "string"){ return; }
    var op_data   = JSON.parse(e.data)
    var recv_time = e.timeStamp/1e6;
    var latency   = recv_time - op_data.t
    console.log('Spacemouse Latency: '+latency*1000+'ms')
    if (op_data.tool !== undefined) {
      console.log(op_data);
      tools[op_data.tool].position.set(-op_data.pos[1],op_data.pos[2],-op_data.pos[0]);
      tools[op_data.tool].quaternion.set(op_data.q[0], op_data.q[1], op_data.q[2], op_data.q[3] )
    }
  };
}, false );