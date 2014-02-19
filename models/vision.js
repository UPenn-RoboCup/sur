/* ----------------------------------------------
 * Reference models overriding on camera feed
 * Qin He, 2014 (c)
 * ---------------------------------------------*/

(function(ctx){
  
  // Object to hold our various setup/interaction methods from main.js
  function Vision(){}
  
  Vision.ball_x = 0;
  Vision.ball_y = 0;
  Vision.ball_r = 0;
  Vision.ball_d = 0;
  
  Vision.goal1Pos = [0,0]; // x, y
  VIsion.goal1Dim = [0,0]; // width, height
  
  Vision.goal2Pos = [0,0]; // x, y
  VIsion.goal2Dim = [0,0]; // width, height
  
  var to_show = true;

  var show_model = function(){
    if (to_show) { 
      var px_str = "x =  " + Vision.ball_x.toString() + " <br>";
      var py_str = "y =  " + Vision.ball_y.toString() + "  <br>";
      var dist_str = "dist =  " + Vision.ball_r.toString() + " m";
      var out_str = px_str + py_str + dist_str;
      // Display
      document.getElementById("ball_info").innerHTML = out_str;
    }
  }
  
  var is_shown = false;
  
  Vision.show = function(){
    is_shown = true;
    // show TODO
  }
  
  Vision.hide = function(){
    is_shown = false;
    // hide TODO
  }
  
  Vision.toggle = function(){
    if(is_shown){Vision.hide()}else{Vision.show()}
  } 

  //TODO:var camera_container = $('#camera_container')[0];
  var camera_container = $('#landmarks')[0];
  var get_coord = function(pos){
    var width = camera_container.clientWidth;
	var height = camera_container.clientHeight;
	return { //TODO
	     ndx: pos[0]/width,
	     ndy: pos[1]/height
	};
  }

  Vision.setup = function(){
    // Websocket configuration for vision landmarks
    var port = 9015;
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.onmessage = function(e){
      //console.log(e);
      var landmarks = JSON.parse(e.data);
      //console.log(landmarks);
      
      // save ball info
      //TODO: might be unnecessary
      var ballPos = get_coord(landmarks.ballPos);
      // In image frame
      Vision.ball_x = ballPos[0];
      Vision.ball_y = ballPos[1];
      Vision.ball_r = landmarks.ballDist;
	  Vision.ball_d = landmarks.ballDia;
	  
      show_model();      
    }
  }
  
  // export
	ctx.Vision = Vision;

})(this);
