// Setup the WebSocket connection and callbacks
// Form the mesh image layer
var last_mesh_img;
var mesh_ctx;
/* Handle the onload of the mesh_image */
var mesh_handler = function(e){
  var w = this.width;
  var h = this.height;
  var img = this;
  mesh_ctx.drawImage(this, 0, 0);
  
  // Remove the image for memory management reasons
  URL.revokeObjectURL(this.src);
  this.src = '';
}

var add_depth_slider = function(){

  var margin = {top: 0, right: 25, bottom: 20, left: 25},
      width = 200 - margin.left - margin.right,
      height = 40 - margin.top - margin.bottom;

  var x = d3.scale.linear()
      .range([0, width])
      .domain([0, 10]);

  var y = d3.random.normal(height / 2, height / 8);

  var brush = d3.svg.brush()
      .x(x)
      .extent([.5, 2])
      .on("brushstart", brushstart)
      .on("brush", brushmove)
      .on("brushend", brushend);

  var arc = d3.svg.arc()
      .outerRadius(height / 2)
      .startAngle(0)
      .endAngle(function(d, i) { return i ? -Math.PI : Math.PI; });

  var svg = d3.select("#bodyheight_slider").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.svg.axis().scale(x).orient("bottom"));

  var brushg = svg.append("g")
      .attr("class", "brush")
      .call(brush);

  brushg.selectAll(".resize").append("path")
      .attr("transform", "translate(0," +  height / 2 + ")")
      .attr("d", arc);

  brushg.selectAll("rect")
      .attr("height", height);

  brushstart();
  brushmove();

  function brushstart() {
  }

  function brushmove() {
    // realtime update of the dynamic range
/*
    var rpc_url = rest_root+'/m/vcm/kinect/depths'
    var vals = brush.extent();
    // perform the post request
    promise.post( rpc_url, {val:JSON.stringify(vals)} ).then(function(error, text, xhr) {
        if(error){ return; }
    });
*/
  }

  function brushend() {
    // ajax to set the depths
    var rpc_url = rest_root+'/m/vcm/kinect/depths'
    var vals = brush.extent();
    // perform the post request
    promise.post( rpc_url, {val:JSON.stringify(vals)} ).then(function(error, text, xhr) {
        if(error){ return; }
    });
  }
}

var add_mesh_buttons = function(){
  var request_btn = document.getElementById('request_mesh_btn');
  var switch_btn  = document.getElementById('switch_mesh_btn');

  // request a new mesh
  request_btn.addEventListener('click', function() {
    //var rpc_url = rest_root+'/m/vcm/chest_lidar/net'
    var rpc_url = rest_root+'/m/vcm/kinect/net_depth'
    var vals = [1,1,90];
    // perform the post request
    promise.post( rpc_url, {val:JSON.stringify(vals)} ).then(function(error, text, xhr) {
        if(error){ return; }
    });
  }, false);

  // switch the type of mesh to request
  switch_btn.addEventListener('click', function() {
    if(switch_btn.textContent=='Head'){
      switch_btn.textContent = "Chest";
    } else {
      switch_btn.textContent = "Head";
    }
  }, false);

}

var mesh_click = function(e){
  console.log(e)
  /*
  // TODO: Allow scaled image clicking for zoom feature
  var sz = mesh_kinetic.getSize();
  // Get the mouse coordinates within the image
  var offset = mesh_kinetic.getPosition();
  var u = e.clientX - offset.x;
  var v = e.clientY - offset.y;
  // Get the image value
  var ctx = mesh_kinetic.getContext();
  var pixel = ctx.getImageData(u, v, 1, 1).data;
  var w = pixel[0];
  if(w==0||w==255){return;}
  
  // Find the world coordinates
  var hFOV = 58*Math.PI/180;
  var vFOV = 45*Math.PI/180;
  // Convert w of 0-255 to actual meters value
  // NOTE: Should receive this in the metadata, 
  // or from mesh request itself
  var near = .5, far = 2;
  var factor = (far-near)/255;
  // Convert form millimeters to meters
  var x = factor*w+near;
  var y = Math.tan(hFOV/2)*2*(u/sz.width-.5)*x;
  var z = Math.tan(vFOV/2)*2*(.5-v/sz.height)*x;
  // World coordinates are in meters
  console.log(w+' World: '+x+','+y+','+z);
  */
}

document.addEventListener( "DOMContentLoaded", function(){

  var mesh_container = document.getElementById('mesh_container');

  // GUI setup
  add_depth_slider();
  add_mesh_buttons();
  // clicking on the mesh
  mesh_container.addEventListener("click", mesh_click, false);
  
  // Websocket Configuration
  var mesh_port = 9004; // kinect
  
  // Checksum and metadata
  var fr_sz_checksum;
  var fr_metadata;

  // setup the canvas element
  var mesh_img = new Image();
  var mesh_canvas = document.createElement('canvas');
  var w = mesh_container.clientWidth;
  var h = mesh_container.clientHeight;
  mesh_canvas.setAttribute('width', w);
  mesh_canvas.setAttribute('height',h);
  mesh_ctx = mesh_canvas.getContext('2d');

  // add the canvas
  mesh_canvas.setAttribute('class','mesh_overlay');
  //mesh_canvas.setAttribute('left','0');
  //mesh_canvas.setAttribute('top','0');
  mesh_container.appendChild( mesh_canvas );
  // add the overlay
  var svg_overlay = d3.select("#mesh_container").append("svg")
    .attr("width", w)
    .attr("height", h)
    .attr('class','mesh_overlay')
    //.attr("position", 'absolute')
    //.attr("left", '0')
    //.attr("top", '0')

  //Draw the Circle
 var circle = svg_overlay.append("circle")
                          .attr("cx", 30)
                          .attr("cy", 30)
                          .attr("r", 20);


  // Connect to the websocket server
  var ws = new WebSocket('ws://' + host + ':' + mesh_port);
  //ws.binaryType = "arraybuffer";
  ws.binaryType = "blob";
  
  ws.open = function(e){
    console.log('connected!')
  }
  ws.onerror = function(e) {
    console.log('error',e)
  }
  ws.onclose = function(e) {
    console.log('close',e)
  }
	
  // Send data to the webworker
  ws.onmessage = function(e){
    if(typeof e.data === "string"){
      fr_metadata   = JSON.parse(e.data)
      var recv_time = e.timeStamp/1e6;
      var latency   = recv_time - fr_metadata.t
      //console.log('mesh Latency: '+latency*1000+'ms',fr_metadata)
      return;
    }
		
    // Use the size as a sort of checksum
    // for metadata pairing with an incoming image
    fr_sz_checksum = e.data.size;
    if(fr_metadata.sz!==fr_sz_checksum){
      console.log('Checksum fail!',fr_metadata.sz,fr_sz_checksum);
      return;
    }
    last_mesh_img = e.data;
    requestAnimationFrame( function(){
      // Put received JPEG data into the image
      mesh_img.src = URL.createObjectURL( last_mesh_img );
      // Trigger processing once the image is fully loaded
      mesh_img.onload = mesh_handler;
    }); //animframe
  };

}, false );