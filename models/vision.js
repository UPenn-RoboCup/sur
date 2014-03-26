/* ----------------------------------------------
 * Reference models overriding on camera feed
 * ---------------------------------------------*/

(function(ctx){
  
  // Object to hold our various setup/interaction methods from main.js
  function Vision(){}
  
  // Declare landmarks
	var myPanel;
  var ball, goal;
  // var line1,line2,line3,line4,line5,line6;  //TODO
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
      var lineStats = vision.line;
      
      getScaleFactors();
      myPanel.clear();
      update_ball(ballStats);
      update_goal(goalStats);
      update_line(lineStats);
        
    }    
		
  }
  
	var setup_model = function(){
	  myPanel = new jsgl.Panel(document.getElementById("monitor_overlay"));

    //TODO: use snap.svg maybe. shouldn't be much different tho...
	  /* Stroke objects */
    var blueStroke = new jsgl.stroke.SolidStroke();
    blueStroke.setColor("blue");
    blueStroke.setWeight(5);
    var redStroke = new jsgl.stroke.SolidStroke();
    redStroke.setColor("red");
    redStroke.setWeight(8);
    

	  /* Create ball model */
	  ball = myPanel.createCircle();
	  ball.setCenterLocationXY(50,50);
	  ball.setRadius(30);
    ball.setStroke(blueStroke)
    ball.getFill().setOpacity(0.3);

    /* Create goal model */
    goal = myPanel.createRectangle();
    goal.setHorizontalAnchor(jsgl.HorizontalAnchor.CENTER);
    goal.setVerticalAnchor(jsgl.VerticalAnchor.MIDDLE);
    goal.setWidth(50);
    goal.setHeight(50);
    goal.setLocationXY(200,200);
    goal.setStroke(blueStroke);
    goal.getFill().setOpacity(0);
    
    // Create multiple lines    
    for (var i=0; i<6; i++) {
      window['line'+i] = myPanel.createLine();
      window['line'+i].setStartPointXY(50,50);
      window['line'+i].setEndPointXY(100,100);
      window['line'+i].setStroke(redStroke);
    }
    
    
    /*
    // TODO: HOW TO DEAL WITH MULTIPLE LINES
    var s = new Snap("#snap");
    // Lets create big circle in the middle:
    var bigCircle = s.circle(150, 150, 100);
    // By default its black, lets change its attributes
    bigCircle.attr({
        fill: "#bada55",
        stroke: "#000",
        strokeWidth: 5
    });
    // Now lets create another small circle:
    var smallCircle = s.circle(100, 150, 70);
    // Lets put this small circle and another one into a group:
    var discs = s.group(smallCircle, s.circle(200, 150, 70));
    */
	}
  
  
  var update_ball = function(ballStats) {
    var ballDetect = ballStats.ballDetect;
    var debug_msg = ballStats.debug_msg;
    
    if (OVERLAY == "ball") {
      var new_msg = debug_msg.replace(/\n/g, "<br>");
      $('#debug_info')[0].innerHTML = new_msg;
    }
    
    // Display information  
    // Detect?      
    if (ballDetect == 1) {
  		var ballSize = ballStats.ballSize;
  		var ballCenter = ballStats.ballCenter;
  		var ballX = ballStats.ballX;
  		var ballY = ballStats.ballY;        
      
      var detect_str = "See ball :) <br>";
			var px_str = "ball_x = " + ballX.toFixed(3).toString() + " m<br>";
			var py_str = "ball_y = " + ballY.toFixed(3).toString() + " m<br>";      
			var out_str = detect_str+px_str+py_str;        
      $('#ball_info')[0].innerHTML = out_str;    
      
      // Update and show overlay            
      var centerX = ballCenter[0]*scaleFactors.x;
      var centerY = ballCenter[1]*scaleFactors.y;
    
      ball.setCenterLocationXY(centerX, centerY);
      ball.setRadius(ballSize);		      
      myPanel.addElement(ball); 
                  
    } else {
      var detect_str = "See No ball :( <br>";
      $('#ball_info')[0].innerHTML = detect_str;
    }
    
  }


  var update_goal = function(goalStats) {
    
    var goalDetect = goalStats.goalDetect;
    var type = goalStats.goalType;
    var debug_msg = goalStats.debug_msg;
    
    if (OVERLAY == "goal") {
      var new_msg = debug_msg.replace(/\n/g, "<br>");
      $('#debug_info')[0].innerHTML = new_msg;
    }
    
    if (goalDetect==1){
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
        myPanel.addElement(goal);
      }
    
    } else {
      $('#goal_info')[0].innerHTML = "=======<br>No goal detected :( <br>";
    }
            
  }

  var update_line = function(lineStats) {
    var lineDetect = lineStats.lineDetect;
    var debug_msg = lineStats.debug_msg;
    
    if (OVERLAY == "line") {
      var new_msg = debug_msg.replace(/\n/g, "<br>");
      $('#debug_info')[0].innerHTML = new_msg;
    }
    
    if (lineDetect==1){
      for (var i=0; i<lineStats.nLines; i++) {
        // Overlay info
        var start_i = lineStats.endpointIJ[i][0]*scaleFactors.x;
        var start_j = lineStats.endpointIJ[i][2]*scaleFactors.y;
        var end_i = lineStats.endpointIJ[i][1]*scaleFactors.x;
        var end_j = lineStats.endpointIJ[i][3]*scaleFactors.y;
        
        var temp = window['line'+i]
        temp.setStartPointXY(start_i,start_j);
        temp.setEndPointXY(end_i,end_j);
        
        if (myPanel.containsElement(temp) == false)
          {myPanel.addElement(temp); }       
      }
      $('#line_info')[0].innerHTML = "=======<br>"+lineStats.nLines+" lines<br>";
    
    } else {
      $('#line_info')[0].innerHTML = "=======<br>No line detected :( <br>";
    }
    
  }
  
  var getScaleFactors = function(){
    // TODO: call this function only when window size changes?
    var x = document.getElementById("monitor_overlay");
    var width = x.offsetWidth;
    var height = x.offsetHeight;
    scaleFactors.x = width / 320;
    scaleFactors.y = height/ 180;
  }

  // export
	ctx.Vision = Vision;

})(this);
