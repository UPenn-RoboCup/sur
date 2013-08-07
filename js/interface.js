// Animation
var stream = 0;
var get_frame = function(){
  var request = {loc: 'chest', quality: 95, range: [.1,2] }
	fr_ws.send( JSON.stringify(request) );
	// Automatically request frames
  //stream = 1-stream;
	//if(stream==1){ requestAnimationFrame( get_frame ); }
}

// add callbacks to DOM elements
document.addEventListener( "DOMContentLoaded", function(){
	$('#req_btn').bind("click",get_frame);
  $('#show_btn').bind("click",function(){
    $('#canvases').toggle();
  });
}, false );