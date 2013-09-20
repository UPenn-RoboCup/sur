// Setup the Kinetic stage for drawing
var stage, stage_container;
document.addEventListener( "DOMContentLoaded", function(){
  stage_container = document.getElementById( 'stage_container' );
  stage = new Kinetic.Stage({
    container: 'stage_container',
    width: stage_container.clientWidth,
    height: stage_container.clientHeight
  });
  console.log('Kinetic stage initialized!');
  // Resize handling
  window.addEventListener( 'resize', function() {
    stage.setWidth(stage_container.clientWidth);
    stage.setWidth(stage_container.clientHeight);
    stage.batchDraw();
  }, false );

}, false );