var last_mesh_img, mesh_ctx, mesh_svg;
var head_mesh_raw_ctx, chest_mesh_raw_ctx, kinect_mesh_raw_ctx;
var mesh_clicks, mesh_points, mesh_depths;
var mesh_in_use = 'chest_lidar';
var mesh_width, mesh_height, mesh_fov = [];
var mesh_worker;

/**
 * useful links
 * attributes for new clicks
 * http://mbostock.github.io/d3/tutorial/circle.html
 * Log all points in our debug zone
 * http://alignedleft.com/tutorials/d3/using-your-data
 * jet
 * http://www.metastine.com/?p=7
*/

/**
 * Buttons for interacting with the mesh
 */
var add_mesh_buttons = function(){
  
  // slow mesh
  
  // request a new mesh
  document.getElementById('request_mesh_btn').addEventListener('click', function() {
    // if testing with the kinect
    var mesh_req_url = rest_root+'/m/vcm/'+mesh_in_use+'/net'
    if(mesh_in_use=='kinect'){mesh_req_url+='_depth';}
    // perform the post request for a reliable PNG
    promise.post( mesh_req_url, {val:JSON.stringify([3,3,90,0])} );
  }, false);

  // switch the type of mesh to request
  document.getElementById('switch_mesh_btn').addEventListener('click', function() {
    // Change the button text
    switch(this.textContent){
      case 'Head':
        this.textContent = "Chest";
        mesh_in_use = 'chest_lidar';
        draw_jet_map(chest_mesh_raw_ctx);
        break;
      case 'Chest':
        this.textContent = "Head";
        mesh_in_use = 'head_lidar';
        draw_jet_map(head_mesh_raw_ctx);
        break;
      default:
        this.textContent = "Kinect";
        mesh_in_use = 'kinect';
        break;
    }
    // clear the clicked points
    mesh_points = [];
    mesh_clicks = [];
    mesh_svg.selectAll("circle")
    .data(mesh_clicks).exit().remove()
    // remove the coord info
    d3.select("#mesh_clicks").selectAll("p")
    .data(mesh_clicks).exit().remove()
  }, false);

  // Clear the points on the mesh
  document.getElementById('clear_mesh_btn').addEventListener('click', function() {
    mesh_points = [];
    mesh_clicks = [];
    mesh_svg.selectAll("circle")
    .data(mesh_clicks).exit().remove()
    // remove the coord info
    d3.select("#mesh_clicks").selectAll("p")
    .data(mesh_clicks).exit().remove()
  }, false);

  // Calculate where the wheel is; send to the robot
  document.getElementById('grabwheel_btn').addEventListener('click', function() {
    var wheel = calculate_wheel(mesh_points);
    if(wheel===undefined){return;}
    var wheel_url = rest_root+'/m/hcm/wheel/model'
    // perform the post request
    promise.post( wheel_url, {val:JSON.stringify(wheel)} ).then(function(error, text, xhr) {
        if(error){ return; }
    });
  }, false);

}
/**
 * Clicking on the mesh canvas element
 */
var mesh_click = function(e){
  var u = e.offsetX;
  var v = e.offsetY;
  // Find the world coordinates
  var point;
  switch(mesh_in_use){
    case 'kinect':
      var w = kinect_mesh_raw_ctx.getImageData(u, v, 1, 1).data[0];
      // do not use saturated pixels
      if(w==0||w==255){return;}
      point = get_kinect_xyz(u,v,w,
        mesh_width,mesh_height,
        mesh_depths[0], mesh_depths[1],
        58*Math.PI/180, 45*Math.PI/180
        );
      break;
    case 'head_lidar':
      var w = head_mesh_raw_ctx.getImageData(u, v, 1, 1).data[0];
      // do not use saturated pixels
      point = get_hokuyo_head_xyz(u,v,w,
        mesh_width,mesh_height,
        mesh_depths[0],mesh_depths[1],
        mesh_fov,
        bodyTilt
      );
      break;
    case 'chest_lidar':
      var w = chest_mesh_raw_ctx.getImageData(u, v, 1, 1).data[0];
      point = get_hokuyo_chest_xyz(u,v,w,
        mesh_width,mesh_height,
        mesh_depths[0],mesh_depths[1],
        mesh_fov,
        bodyTilt
      );
      break;
    default:
      return;
  }
    
  if(point===null){return;}

  // save the click
  mesh_clicks.push( new THREE.Vector3(u,v,w) );
  var p = new THREE.Vector3()
  mesh_points.push( p.fromArray(point) );

  d3.select("#mesh_clicks").selectAll("p")
    .data(mesh_points)
    .enter()
    .append("p")
    .text( function(d){return sprintf('(%.3f,.3f,.3f)',d.x,d.y,d.z);} );

  // the svg overlay has the circles for where we clicked
  var click_circles = mesh_svg.selectAll("circle")
  .data(mesh_clicks).enter()
  .append("circle").style("fill", "white")
  .attr("cx", function(p,i){return p.x;}) // x position
  .attr("cy", function(p,i){return p.y;}) // y position
  .attr("r", 4); // radius
  


}

/* Handle the onload of the mesh_image */
var mesh_handler = function(e){
  var w = this.width;
  var h = this.height;
  var img = this;

  // useful information
  var half_w = w/2;
  var half_h = h/2;
  var diff   = (h-w)/2;

  var raw_ctx;

  // Rotate if the chest...
  switch(this.alt){
    case 'head_lidar':
      raw_ctx = head_mesh_raw_ctx;
      raw_ctx.save();
      // flip context horizontally
      raw_ctx.translate(half_w, 0);
      raw_ctx.scale(-1, 1);
      raw_ctx.translate(-half_w, 0);
      head_mesh_raw_ctx.drawImage(this, 0, 0);
      raw_ctx.restore();
      mesh_width  = w;
      mesh_height = h;
      break;
    case 'chest_lidar':
      raw_ctx = chest_mesh_raw_ctx;
      raw_ctx.save();
      raw_ctx.translate(half_w, half_h);
      // rotate canvas
      raw_ctx.rotate(Math.PI/2);
      // if the image is not square, 
      // add half the difference of the smaller to the larger one
      half_h+=diff;
      half_w+=diff;
      raw_ctx.drawImage(this, -half_w, -half_h);
      raw_ctx.restore();
      mesh_width  = h;
      mesh_height = w;
      break;
    case 'kinect':
      raw_ctx = kinect_mesh_raw_ctx;
    default:
      mesh_width  = w;
      mesh_height = h;
      raw_ctx.drawImage(this, 0, 0);
      break;
  }

  // Remove the image for memory management reasons
  URL.revokeObjectURL(this.src);
  this.src = '';

  if(this.alt != mesh_in_use){
    // do not update the mesh if it is not the one in use
    return;
  }

  // draw to our context
  draw_jet_map(raw_ctx);

  // Place into 3D coordinates if 3d is available
  if(mesh_to_three!==undefined){
    mesh_to_three(
      raw_ctx,[mesh_width,mesh_height], mesh_depths, mesh_fov, mesh_in_use
    );
  }

}

document.addEventListener( "DOMContentLoaded", function(){

  var mesh_container = document.getElementById('mesh_container');

  // GUI setup
  add_depth_slider();
  add_mesh_buttons();
  // clicking on the mesh
  mesh_container.addEventListener("click", mesh_click, false);
  var w = mesh_container.clientWidth;
  var h = mesh_container.clientHeight;
  
  // Websocket Configuration
  //var mesh_port = 9004; // kinect
  var mesh_port = 9001; // lidar
  
  // checksum & metadata
  var fr_sz_checksum, fr_metadata;

  // setup the canvas element
  var mesh_img = new Image();
  //
  var head_mesh_raw  = document.createElement("canvas");
  var chest_mesh_raw = document.createElement("canvas");
  // make big enough
  head_mesh_raw.setAttribute('width', w);
  head_mesh_raw.setAttribute('height',h);
  chest_mesh_raw.setAttribute('width', w);
  chest_mesh_raw.setAttribute('height',h);
  head_mesh_raw_ctx  = head_mesh_raw.getContext('2d');
  chest_mesh_raw_ctx = chest_mesh_raw.getContext('2d');
  //
  var mesh_canvas = document.createElement('canvas');
  mesh_canvas.setAttribute('width', w);
  mesh_canvas.setAttribute('height',h);
  mesh_canvas.setAttribute('class','mesh_overlay');
  mesh_ctx = mesh_canvas.getContext('2d');
  // add the canvas
  mesh_container.appendChild( mesh_canvas );

  // add the d3 overlay
  mesh_svg = d3.select("#mesh_container").append("svg")
    .attr("width",  w)
    .attr("height", h)
    .attr('class','mesh_overlay');

  // reset the 2D clicked and local 3D points
  mesh_points = [];
  mesh_clicks = [];

  // Connect to the websocket server
  var ws = new WebSocket('ws://' + host + ':' + mesh_port);
  ws.binaryType = "blob";

  // Send data to the webworker
  ws.onmessage = function(e){
    if(typeof e.data === "string"){
      fr_metadata   = JSON.parse(e.data)
      var recv_time = e.timeStamp/1e6;
      var latency   = recv_time - fr_metadata.t
      
      //console.log('mesh Latency: '+latency*1000+'ms',fr_metadata);
      
      mesh_depths = fr_metadata.depths.slice(0);
      if(fr_metadata.name=='chest_lidar'){
        /*
        mesh_fov[1] = fr_metadata.fov[1]-fr_metadata.fov[0];
        mesh_fov[0] = fr_metadata.scanlines[1]-fr_metadata.scanlines[0];
        */
        mesh_fov[0] = fr_metadata.scanlines[0]; // horiz start
        mesh_fov[1] = fr_metadata.scanlines[1]; // horiz end
        mesh_fov[2] = fr_metadata.fov[0]; // vert start
        mesh_fov[3] = fr_metadata.fov[1]; // vert end
        
      } else {
        /*
        mesh_fov[0] = fr_metadata.fov[1]-fr_metadata.fov[0];
        mesh_fov[1] = fr_metadata.scanlines[1]-fr_metadata.scanlines[0];
        */
        mesh_fov[0] = fr_metadata.fov[0]; // horiz start
        mesh_fov[1] = fr_metadata.fov[1]; // horiz end
        mesh_fov[2] = fr_metadata.scanlines[0]; // vert start
        mesh_fov[3] = fr_metadata.scanlines[1]; // vert end
      }
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
      // Put received JPEG/PNG data into the image
      mesh_img.src = URL.createObjectURL(
        last_mesh_img.slice(0,last_mesh_img.size,'image/'+fr_metadata.c)
      );
      mesh_img.alt = fr_metadata.name;
      // Trigger processing once the image is fully loaded
      mesh_img.onload = mesh_handler;
    }); //animframe
  };

}, false );

var draw_jet_map = function(raw_ctx){
  // clear the context
  var w = mesh_ctx.canvas.width;
  var h = mesh_ctx.canvas.height;
  mesh_ctx.clearRect( 0 , 0 , 500 , 500 );

  // Grab the raw data
  var rawDataImage = raw_ctx.getImageData(0, 0, w, h);
  var data = rawDataImage.data;
  
  // Convert each RGBA pixel
  for(var i = 0; i < data.length; i += 4) {
    var cm    = jet(data[i]);
    data[i]   = cm[0];
    data[i+1] = cm[1];
    data[i+2] = cm[2];
  }
  
  // overwrite previous image
  mesh_ctx.putImageData(rawDataImage, 0, 0);
}

var add_depth_slider = function(){

  // CSS style for the slider
  var margin = {top: 0, right: 12, bottom: 18, left: 12},
      width = 200 - margin.left - margin.right,
      height = 40 - margin.top - margin.bottom;

  var x = d3.scale.pow()
      .exponent(.5)
      .range([0, width])
      .domain([0, 30]);

  var y = d3.random.normal(height / 2, height / 8);

  var brush = d3.svg.brush()
      .x(x)
      .extent([.1, 5])
      .on("brushend", brushend);

      // Make the handle
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
      .call(d3.svg.axis().scale(x).orient("bottom").tickValues([0,.2,1,3,5,10,20,30])
      .tickFormat(d3.format("g"))
    );

  var brushg = svg.append("g")
      .attr("class", "brush")
      .call(brush);

  brushg.selectAll(".resize").append("path")
      .attr("transform", "translate(0," +  height / 2 + ")")
      .attr("d", arc);

  brushg.selectAll("rect")
      .attr("height", height);

  // TODO: Use brushmove/brushstart possibly
  function brushend() {
    // ajax to set the depths
    var rpc_url = rest_root+'/m/vcm/'+mesh_in_use+'/depths'
    var vals = brush.extent();
    // perform the post request
    promise.post( rpc_url, {val:JSON.stringify(vals)} ).then(function(error, text, xhr) {
        if(error){ return; }
    });
  }
  
  // Call immediately to set on the robot the desired ranges
  brushend();
}