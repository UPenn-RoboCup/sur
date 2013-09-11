// Setup the Kinetic stage for drawing
var stage;
document.addEventListener( "DOMContentLoaded", function(){
  stage = new Kinetic.Stage({
    container: 'stage_container',
    width: 640,
    height: 480
  });
}, false );