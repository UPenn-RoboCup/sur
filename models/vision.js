/* ----------------------------------------------
 * Reference models overriding on camera feed
 * ---------------------------------------------*/

(function(ctx){
  
  // Object to hold our various setup/interaction methods from main.js
  function Vision(){}
  
  // Declare landmarks
	var myPanel;
  var ball;
	var goal;
  var scaleFactors = {};
  
  
  var to_show = true;

  var show_model = function(){
    //if (to_show) { 
      var px_str = "x =  " + Vision.ball_x.toString() + " <br>";
      var py_str = "y =  " + Vision.ball_y.toString() + "  <br>";
      var dist_str = "dist =  " + Vision.ball_r.toString() + " m";
      var out_str = px_str + py_str + dist_str;
    //}
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

  // Setup canvas and WebSocket
  Vision.setup = function(){  	
    setup_model();
    
    // Websocket configuration for vision landmarks
    var port = 9015;
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.binaryType = "arraybuffer";
    ws.onmessage = function(e){
      //console.log(e);
      var vision = JSON.parse(e.data);
            
			// Retriet ballStats
      var ballStats = vision.ball;
      var goalStats = vision.goal;
      
      getScaleFactors();
      update_ball(ballStats);
      update_goal(goalStats);
        
    }    
		
  }
  
	var setup_model = function(){
	  myPanel = new jsgl.Panel(document.getElementById("monitor_overlay"));

    //TODO: use snap.svg maybe. shouldn't be much different tho...
	  /* Start drawing! */

	  /* Create ball and modify it */
	  ball = myPanel.createCircle();
	  ball.setCenterLocationXY(50,50);
	  ball.setRadius(30);
	  ball.getStroke().setWeight(5);
	  ball.getStroke().setColor("rgb(0,0,255)");
    ball.getFill().setOpacity(0.3);
    myPanel.addElement(ball);

    /* Create goal and modify it */
    goal = myPanel.createRectangle();
    goal.setHorizontalAnchor(jsgl.HorizontalAnchor.CENTER);
    goal.setVerticalAnchor(jsgl.VerticalAnchor.MIDDLE);
    goal.setWidth(50);
    goal.setHeight(50);
    goal.setLocationXY(200,200);
    goal.getStroke().setWeight(5);
    goal.getStroke().setColor("rgb(0,0,255)");
    goal.getFill().setOpacity(0);
    myPanel.addElement(goal);
		
	}
  
  
  var update_ball = function(ballStats) {
    var ballDetected = ballStats.ballDetect;
		var ballSize = ballStats.ballSize;
		var ballCenter = ballStats.ballCenter;
		var ballX = ballStats.ballX;
		var ballY = ballStats.ballY;        

    var debug_msg = ballStats.debug_msg;
    // Display information  
    // Detect?      
    if (ballDetected == 1) {
      var detect_str = "See ball :) <br>";
      // ball position
			var px_str = "ball_x = " + ballX.toFixed(3).toString() + " m<br>";
			var py_str = "ball_y = " + ballY.toFixed(3).toString() + " m<br>";      
			var out_str = detect_str+px_str+py_str;        
      $('#ball_info')[0].innerHTML = out_str;    
      
      // Update and show overlay            
      var centerX = ballCenter[0]*scaleFactors.x;
      var centerY = ballCenter[1]*scaleFactors.y;
      // ballSize = Math.sqrt(Math.min(scaleFactors.x, scaleFactors.y)) * ballSize; // ROUGHLY resize
    
      ball.setCenterLocationXY(centerX, centerY);
      ball.setRadius(ballSize);		      
      if (myPanel.containsElement(ball) == false)
        { myPanel.addElement(ball); }
                  
    } else {
      var detect_str = "See No ball :( <br>";
      $('#ball_info')[0].innerHTML = detect_str;
      // Do not show
      if (myPanel.containsElement(ball) == true) 
        { myPanel.removeElement(ball); }
    }
    
    if (OVERLAY == "ball") {
      var new_msg = debug_msg.replace(/\n/g, "<br>");
      $('#debug_info')[0].innerHTML = new_msg;
    }
    
    
  }


  var update_goal = function(goalStats) {
    
    var goalDetected = goalStats.goalDetect;
    var type = goalStats.goalType;
    var debug_msg = goalStats.debug_msg;
    
    if (goalDetected==1){
      if (type<3) {
        if (type==0){
          var goal_type = "Single unknown post <br>";
        } else if (type==1) {
          var goal_type = "LEFT post <br>";
        } else {
          var goal_type = "RIGHT post <br>";
        }
        
        // World info               
        var x = goalStats.positions[0][0];
        var y = goalStats.positions[0][1];
  			var px_str = "goal_x = " + x.toFixed(2).toString() + " m<br>";
  			var py_str = "goal_y = " + y.toFixed(2).toString() + " m<br>";      
  			
        var out_str = "=======<br>"+goal_type+px_str+py_str;        
        $('#goal_info')[0].innerHTML = out_str;
        
        // Overlay info
        var center_i = goalStats.centroids[0][0]*scaleFactors.x;
        var center_j = goalStats.centroids[0][1]*scaleFactors.y;
        var height = goalStats.heights[0]*scaleFactors.y;
        var width = goalStats.widths[0]*scaleFactors.x;
        
        // Update overlay
        goal.setWidth(width);
        goal.setHeight(height);
        goal.setLocationXY(center_i,center_j);
        
        if (myPanel.containsElement(goal) == false)
          { myPanel.addElement(goal); }
      } else {
        // two posts detected, draw the whole bounding box
        var goal_type = "Two posts <br>";
        
        // World info
        var x1 = goalStats.positions[0][0];
        var y1 = goalStats.positions[0][1];      
        var x2 = goalStats.positions[1][0];
        var y2 = goalStats.positions[1][1]; 
        var x = (x1+x2)/2;
        var y = (y1+y2)/2;
  			var px_str = "goal_x = " + x.toFixed(2) + " m<br>";
  			var py_str = "goal_y = " + y.toFixed(2) + " m<br>"; 
        
        var out_str = "=======<br>"+goal_type+px_str+py_str;        
        $('#goal_info')[0].innerHTML = out_str;

        
        // Overlay info
        var BBox = goalStats.goalBBox;
        
        var width = (BBox[1]-BBox[0])*scaleFactors.x;
        var height = (BBox[3]-BBox[2])*scaleFactors.y;
        var center_i = (BBox[0]+BBox[1])/2*scaleFactors.x;
        var center_j = (BBox[2]+BBox[3])/2*scaleFactors.y;
        
        // Update overlay
        goal.setWidth(width);
        goal.setHeight(height);
        goal.setLocationXY(center_i,center_j);
             
        if (myPanel.containsElement(goal) == false)
          { myPanel.addElement(goal); }
        
      }
    
    } else {
      var detect_str = "No goal detected :( <br>";
      // Do not show
      if (myPanel.containsElement(goal) == true) 
        { myPanel.removeElement(goal); }
    }
    
    if (OVERLAY == "goal") {
      var new_msg = debug_msg.replace(/\n/g, "<br>");
      $('#debug_info')[0].innerHTML = new_msg;
    }
    
        
  }

  
  var getScaleFactors = function(){
    // TODO: call this function only when window size changes
    var x = document.getElementById("monitor_overlay");
    var width = x.offsetWidth;
    var height = x.offsetHeight;
    scaleFactors.x = width / 320;
    scaleFactors.y = height/ 180;
  }
   
  // export
	ctx.Vision = Vision;

})(this);
