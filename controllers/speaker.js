(function(ctx){
  
  // Object to hold our various setup/interaction methods from main.js
  function Speaker(){}
  
  var acontext;

  function playSound(buffer) {
    var source = acontext.createBufferSource(); // creates a sound source
    console.log('source',source,buffer)
    source.buffer = buffer;                    // tell the source which sound to play
    source.connect(acontext.destination);       // connect the source to the context's destination (the speakers)
    source.start(0);                           // play the source now
                                               // note: on older systems, may have to use deprecated noteOn(time);
  }
  
  Speaker.setup = function(){
    // Websocket Configuration for feedback
    var port = 9014;
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.binaryType = "arraybuffer";
    console.log('audio',ws);
    ws.onmessage = function(e){
      console.log(e);
      if(typeof e.data === "string"){
        
      } else {
        acontext.decodeAudioData(e.data, function(buffer) {
          playSound(buffer);
        },
        function(err){console.log('audio err',err)}
        );
      }
    }
    
    try {
      // Fix up for prefixing
      ctx.AudioContext = ctx.AudioContext||ctx.webkitAudioContext;
      acontext = new AudioContext();
      console.log('Audio loaded!');
    }
    catch(e) {
      alert('Web Audio API is not supported in this browser');
    }
    
  }
  ctx.Speaker = Speaker;
})(this);