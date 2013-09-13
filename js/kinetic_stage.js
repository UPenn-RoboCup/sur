// Setup the Kinetic stage for drawing
var stage;
document.addEventListener( "DOMContentLoaded", function(){
  stage = new Kinetic.Stage({
    container: 'stage_container',
    width: 360,
    height: 280
  });
  console.log('Kinetic stage initialized!');
}, false );