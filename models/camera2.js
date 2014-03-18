/*****
 * Camera2 display in the DOM
 */
(function(ctx){
  
  // Function to hold methods
  function Camera2(){}
  
  // Make the image object
  var old_imgs = []
  var camera_img;
	
  // Declare landmarks
	var myPanel;
  var circle;
	var label;
	var goalpost, obstacle;

Camera2.latency = [];  

  // network settings for the camera
  var rpc_url = rest_root+'/m/vcm/forehead_camera/net'
  
  Camera2.get_image = function(){
    return camera_img;
  }

  /* Handle the onload of a new camera_image */
  var camera_handler = function(e){
    // revoke the object urls for memory management
    for(var i=0,j=old_imgs.length-1;i<j;i++){
      URL.revokeObjectURL( old_imgs.shift() );
    }
  } // camera handler

  /*******
  * Websocket setup
  ******/
  Camera2.setup = function(){
    camera_img = new Image();
    camera_img.id  = 'head_camera';
    camera_img.alt = 'No head_camera image yet...' 
    
		setup_model();   

    // Websocket Configuration
    var port = 9004; // head cam
    // checksum & metadata
    var fr_sz_checksum, fr_metadata, last_camera_img;
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.binaryType = "blob";
    // Send data to the webworker
    ws.onmessage = function(e){      
      if(typeof e.data === "string"){        
        fr_metadata = JSON.parse(e.data);
				
				// Process vision landmarks messages
        var ballDetected = fr_metadata.ballDetect;
				var ballSize = fr_metadata.ballSize;
				var ballCenter = fr_metadata.ballCenter;
				var ballX = fr_metadata.ballX;
				var ballY = fr_metadata.ballY;        


        // Display information        
        var detect_str = "Detected?  ";
        if (ballDetected == 1) {detect_str = "See ball :) <br>";}
        else {detect_str = "See No ball :( <br>";}
				var centerx_str = "centroid_I = " + Math.round(ballCenter[0]).toString() + "<br>";        
				var centery_str = "centroid_J = " + Math.round(ballCenter[1]).toString() + "<br>";
        // var dia_str = "Diameter = " + ballSize.toFixed(2).toString() + " <br>";
				var px_str = "ball_x = " + ballX.toFixed(2).toString() + " m<br>";
				var py_str = "ball_y = " + ballY.toFixed(2).toString() + " m<br>";
        
				var out_str = detect_str+centerx_str+centery_str+px_str+py_str;        
        $('#ball_info')[0].innerHTML = out_str;
				
        // If no ball detected, then don't show
        if (ballDetected == 1) {
          update_model(ballCenter, ballSize);
           if (myPanel.containsElement(circle) == false) {myPanel.addElement(circle);}
        } else if (myPanel.containsElement(circle) == true) {
          myPanel.removeElement(circle);
        }
				
				// console.log('Camera2',fr_metadata.sz);
        return;
      }
      /* Use the size as a sort of checksum
        for metadata pairing with an incoming image */
      fr_sz_checksum = e.data.size;
      if(fr_metadata.sz!==fr_sz_checksum){
        console.log('Camera2 Checksum fail!',fr_metadata.sz,fr_sz_checksum);
        return;
      }
      // Save the last received image, for delayed rendering
      last_camera_img = e.data.slice(
        0,e.data.size,'image/'+fr_metadata.c
      );

      // Perform a render
      requestAnimationFrame( function(){
        // Decompress image via browser
        camera_img.src = URL.createObjectURL(last_camera_img);
        old_imgs.push(camera_img.src);
        // Trigger processing once the image is fully loaded
        camera_img.onload = camera_handler;
      }); //animframe

    };
    		
  } // Websocket handling
	
	
	var setup_model = function(){
	  myPanel = new jsgl.Panel(document.getElementById("test_draw"));

    //TODO: use snap.svg maybe. shouldn't be much different tho...
	  /* Start drawing! */

	  /* Create circle and modify it */
	  circle = myPanel.createCircle();
	  circle.setCenterLocationXY(50,50);
	  circle.setRadius(30);
	  circle.getStroke().setWeight(5);
	  circle.getStroke().setColor("rgb(255,0,0)");
	  circle.getFill().setColor("rgb(255,0,0)");
	  circle.getFill().setOpacity(0.5);
    myPanel.addElement(circle);

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
    circle.setCenterLocationXY(ballCenter[0]*2,ballCenter[1]*2);
    circle.setRadius(ballSize);		
	}

  // export
	ctx.Camera2 = Camera2;

})(this);
