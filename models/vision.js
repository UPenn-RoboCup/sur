/* ----------------------------------------------
 * Reference models overriding on camera feed
 * ---------------------------------------------*/

(function(ctx){
  
  // Object to hold our various setup/interaction methods from main.js
  function Vision(){}
  
  // Declare landmarks
	var myPanel;
  var ball;
	var goalpost, obstacle;
  
  
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
      var ballDetected = vision.ball.ballDetect;
			var ballSize = vision.ball.ballSize;
			var ballCenter = vision.ball.ballCenter;
			var ballX = vision.ball.ballX;
			var ballY = vision.ball.ballY;        

      // Display information        
      var detect_str = "Detected?  ";
      if (ballDetected == 1) {detect_str = "See ball :) <br>";}
      else {detect_str = "See No ball :( <br>";}
			var centerx_str = "centroid_I = " + Math.round(ballCenter[0]).toString() + "<br>";        
			var centery_str = "centroid_J = " + Math.round(ballCenter[1]).toString() + "<br>";
      // var dia_str = "Diameter = " + ballSize.toFixed(2).toString() + " <br>";
			var px_str = "ball_x = " + ballX.toFixed(3).toString() + " m<br>";
			var py_str = "ball_y = " + ballY.toFixed(3).toString() + " m<br>";
      
			var out_str = detect_str+centerx_str+centery_str+px_str+py_str;        
      $('#ball_info')[0].innerHTML = out_str;
			
      // If no ball detected, then don't show
      if (ballDetected == 1) {
        update_model(ballCenter, ballSize);
         if (myPanel.containsElement(ball) == false) {myPanel.addElement(ball);}
      } else if (myPanel.containsElement(ball) == true) {
        myPanel.removeElement(ball);
      }
      
  
      update_model(ballCenter, ballSize);      
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
	  ball.getStroke().setColor("rgb(255,0,0)");
	  ball.getFill().setColor("rgb(255,0,0)");
	  ball.getFill().setOpacity(0.5);
    myPanel.addElement(ball);

	  /* Create polygon and modify it */
	  // polygon = myPanel.createPolygon();
	  // polygon.addPointXY(50,50);
	  // polygon.addPointXY(110,50);
	  // polygon.addPointXY(150,80);
	  // polygon.addPointXY(110,110);
	  // polygon.addPointXY(50,110);
	  // polygon.getStroke().setWeight(5);
	  // polygon.getStroke().setColor("rgb(0,0,255)");
	  // polygon.getFill().setColor("rgb(0,255,0)");
	  // polygon.getFill().setOpacity(0.5);
	  // myPanel.addElement(polygon);

	  /* Create text label and modify it */
    // label = myPanel.createLabel();
    // label.setText("Hello World!");
    // label.setLocationXY(30,120);
    // label.setBold(true);
    // label.setFontFamily("sans-serif");
    // label.setFontSize(20);
    // myPanel.addElement(label);
		
	}
	
	var update_model = function(ballCenter, ballSize){
    ball.setCenterLocationXY(ballCenter[0]*2,ballCenter[1]*2);
    ball.setRadius(ballSize);		
	}
   
  // export
	ctx.Vision = Vision;

})(this);
