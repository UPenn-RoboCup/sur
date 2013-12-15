(function(ctx){
  
  // Object to hold our various setup/interaction methods from main.js
  function Speaker(){}
  
  Speaker.setup = function(){
    // Websocket Configuration for feedback
    var port = 9014;
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.binaryType = "arraybuffer";
    ws.onmessage = function(e){
      console.log(e);    
    }
  }
  ctx.Speaker = Speaker;
})(this);