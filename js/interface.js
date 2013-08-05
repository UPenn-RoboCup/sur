// Animation
var stream = 0;
var get_frame = function(){
  var request = {type: 'chest', quality: 90, range: [.05,2] }
	fr_ws.send( JSON.stringify(request) );
  console.log('Requesting frame...');
	// Automatically request frames
  //stream = 1-stream;
	//if(stream==1){ requestAnimationFrame( get_frame ); }
}

// add callbacks to DOM elements

document.addEventListener( "DOMContentLoaded", function(){
	$('#req_btn').bind("click",get_frame);
}, false );