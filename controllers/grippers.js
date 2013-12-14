var context;
window.addEventListener('load', init, false);
function init() {
  try {
    // Fix up for prefixing
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    context = new AudioContext();
    console.log('Audio loaded!')
  }
  catch(e) {
    alert('Web Audio API is not supported in this browser');
  }
}

function playSound(buffer) {
  var source = context.createBufferSource(); // creates a sound source
  source.buffer = buffer;                    // tell the source which sound to play
  source.connect(context.destination);       // connect the source to the context's destination (the speakers)
  source.start(0);                           // play the source now
                                             // note: on older systems, may have to use deprecated noteOn(time);
}

// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  
  qwest.get('/a',{},{},function(){
    this.responseType = "arraybuffer";
   })
   .success(function(response){
      // Blah blah blah
      console.log('hi',response);
      
      context.decodeAudioData(response, function(buffer) {
        console.log('huh?',buffer);
        playSound(buffer)
            //dogBarkingBuffer = buffer;
      }, function(err){console.log('audio err',err)});
      
   });
       
  // Right Trigger
  clicker('rt_trigger',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: 200});
  });
  clicker('rt_hold',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: 50});
  });
  clicker('rt_open',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: -10});
  });
  clicker('rt_loose',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: 0});
  });
  
  // Right Grip
  clicker('rg_trigger',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: 200});
  });
  clicker('rg_hold',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: 50});
  });
  clicker('rg_open',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: -10});
  });
  clicker('rg_loose',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: 0});
  });
  
  // Left Trigger
  clicker('lt_trigger',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: 200});
  });
  clicker('lt_hold',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: 50});
  });
  clicker('lt_open',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: -10});
  });
  clicker('lt_loose',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: 0});
  });
  
  // Left Grip
  clicker('lg_trigger',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: 200});
  });
  clicker('lg_hold',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: 50});
  });
  clicker('lg_open',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: -10});
  });
  clicker('lg_loose',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: 0});
  });
  
});