/* ----------------------------------------------
 * Reference models overriding on camera feed
 * ---------------------------------------------*/

(function(ctx){
  
  // Object to hold our various setup/interaction methods from main.js
  function Vision(){}
  
	var overlay, ball, goal;
  var field, robot, ballGlobal;
  var scaleFactors = {};
  
  
  var to_show = true;
  
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
    //TODO: OccMap for path planning
    
    setup_model();
    setup_field();
    
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
      var robotStats = vision.robot;
      
      getScaleFactors();
      overlay.clear();
      update_ball(ballStats);
      update_goal(goalStats);
      update_line(lineStats);
      update_world(ballStats, robotStats);
    }    
		
  }
  
	var setup_model = function(){
	  overlay = new jsgl.Panel(document.getElementById("monitor_overlay"));

    //TODO: use snap.svg maybe. shouldn't be much different tho...
	  /* Stroke objects */
    var blueStroke = new jsgl.stroke.SolidStroke();
    blueStroke.setColor("blue");
    blueStroke.setWeight(5);
    var redStroke = new jsgl.stroke.SolidStroke();
    redStroke.setColor("red");
    redStroke.setWeight(8);
    

	  /* Create ball model */
	  ball = overlay.createCircle();
	  ball.setCenterLocationXY(50,50);
	  ball.setRadius(30);
    ball.setStroke(blueStroke)
    ball.getFill().setOpacity(0.3);

    /* Create goal model */
    goal = overlay.createRectangle();
    goal.setHorizontalAnchor(jsgl.HorizontalAnchor.CENTER);
    goal.setVerticalAnchor(jsgl.VerticalAnchor.MIDDLE);
    goal.setWidth(50);
    goal.setHeight(50);
    goal.setLocationXY(200,200);
    goal.setStroke(blueStroke);
    goal.getFill().setOpacity(0);
    
    // Create multiple lines    
    for (var i=0; i<6; i++) {
      window['line'+i] = overlay.createLine();
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
  
  var setup_field = function() {
	  field = new jsgl.Panel(document.getElementById("monitor_field"));
    var x_margin = 10;
    var y_margin = 10;
    var blueStroke = new jsgl.stroke.SolidStroke();
    blueStroke.setColor("blue");
    blueStroke.setWeight(4);
   
    var boundary = field.createRectangle();
    boundary.setWidth(480);
    boundary.setHeight(320);
    boundary.setLocationXY(x_margin,y_margin);
    boundary.setStroke(blueStroke);
    boundary.getFill().setOpacity(0);
    field.addElement(boundary);
    
    var goalAread1 = field.createRectangle();
    goalAread1.setWidth(53);
    goalAread1.setHeight(267);
    goalAread1.setLocationXY(x_margin,y_margin+26.5);
    goalAread1.setStroke(blueStroke);
    goalAread1.getFill().setOpacity(0);
    field.addElement(goalAread1);
    
    var goalAread2 = field.createRectangle();
    goalAread2.setWidth(53);
    goalAread2.setHeight(267);
    goalAread2.setLocationXY(x_margin+427,y_margin+26.5);
    goalAread2.setStroke(blueStroke);
    goalAread2.getFill().setOpacity(0);
    field.addElement(goalAread2);
    
	  var circle = field.createCircle();
	  circle.setCenterLocationXY(x_margin+240,y_margin+160);
	  circle.setRadius(40);
    circle.setStroke(blueStroke)
    circle.getFill().setOpacity(0);
    field.addElement(circle);
    
    var center_line = field.createLine();
    center_line.setStartPointXY(x_margin+240,y_margin);
    center_line.setEndPointXY(x_margin+240,y_margin+320);
    center_line.setStroke(blueStroke);
    field.addElement(center_line);
    
    var spot1 = field.createCircle();
	  spot1.setCenterLocationXY(x_margin+112,y_margin+160);
	  spot1.setRadius(3);
    spot1.setStroke(blueStroke)
    field.addElement(spot1);

    var spot2 = field.createCircle();
	  spot2.setCenterLocationXY(x_margin+368,y_margin+160);
	  spot2.setRadius(3);
    spot2.setStroke(blueStroke)
    field.addElement(spot2);
    
    // Robot 
    robot = field.createGroup();
    field.addElement(robot);
    var triangle = field.createPolygon();
    triangle.addPointXY(-15,0);
    triangle.addPointXY(15,-10);
    triangle.addPointXY(15,10);
    triangle.getStroke().setColor('rgb(0,255,0)')
    triangle.getFill().setColor("rgb(0,255,0)");
    robot.addElement(triangle);
    robot.setLocationXY(x_margin+240, y_margin+160);
    
    // Ball
    ballGlobal = field.createCircle();
	  ballGlobal.setCenterLocationXY(x_margin+300,y_margin+160);
	  ballGlobal.setRadius(5);
    ballGlobal.getStroke().setColor('rgb(255,0,0)');
    ballGlobal.getFill().setColor("rgb(255,0,0)");
    field.addElement(ballGlobal);
    
    
    // Obstacle
    
  }
  
  
  var local2global = function(pose, v) {
    //Transform pose from local to global
  }
  
  var global2image = function(p) {
    // Transform pose from global to pixel frame
  }
  
  var update_world = function(ballStats, robotStats) {
    if (OVERLAY == 'world') {
      var debug_msg = robotStats.debug_msg;
      var new_msg = debug_msg.replace(/\n/g, "<br>");
      $('#debug_info')[0].innerHTML = new_msg;
    }
    
    // update ball
		var ballX = ballStats.ballX;
		var ballY = ballStats.ballY;        
		var px_str = "ball_x = " + ballX.toFixed(3).toString() + " m<br>";
		var py_str = "ball_y = " + ballY.toFixed(3).toString() + " m<br>";      
		var out_str = px_str+py_str;        
    $('#ball_info')[0].innerHTML = "=======<br>"+out_str;    

    
    // Update robot pose
    var robot_x = robotStats.pose[0];
    var robot_y = robotStats.pose[1];
    var robot_a = robotStats.pose[2];
    var x_str = "robot_x = "+robot_x.toFixed(2).toString()+" m<br>";
    var y_str = "robot_y = "+robot_y.toFixed(2).toString()+" m<br>";
    var a_str = "robot_a = "+robot_a.toFixed(2).toString()+" rad<br>";
		var pose_str = x_str+y_str+a_str;        
    $('#robot_info')[0].innerHTML = pose_str;    
    // $('#robot_info')[0].innerHTML = "TESTING";    
    
    
    
    // TODO: update triangle 
    
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
      
      // Update and show overlay            
      var centerX = ballCenter[0]*scaleFactors.x;
      var centerY = ballCenter[1]*scaleFactors.y;
    
      ball.setCenterLocationXY(centerX, centerY);
      ball.setRadius(ballSize);		      
      overlay.addElement(ball); 
                  
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
        
        if (overlay.containsElement(goal) == false)
          { overlay.addElement(goal); }
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
        overlay.addElement(goal);
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
        
        if (overlay.containsElement(temp) == false)
          {overlay.addElement(temp); }       
      }
      $('#line_info')[0].innerHTML = "=======<br>"+lineStats.nLines+" lines<br>";
    
    } else {
      $('#line_info')[0].innerHTML = "=======<br>No line detected :( <br>";
    }
    
  }
  
  var getScaleFactors = function(){
    // Label image
    var x = document.getElementById("monitor_overlay");
    var width = x.offsetWidth;
    var height = x.offsetHeight;
    scaleFactors.x = width / 320;
    scaleFactors.y = height/ 180;
  }

  // export
	ctx.Vision = Vision;

})(this);
