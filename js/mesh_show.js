// Setup the WebSocket connection and callbacks
// Form the mesh image layer
var last_mesh_img, mesh_ctx, mesh_svg;
var head_mesh_raw_ctx, chest_mesh_raw_ctx, kinect_mesh_raw_ctx;
var mesh_clicks, mesh_points, mesh_depths;
var mesh_in_use = 'chest_lidar';
var mesh_width, mesh_height, mesh_fov = [];
var mesh_worker;

// Robot properties for where the LIDARs are
var chest_depth    = 0.05;
var chest_height   = 0.09;
var chest_off_axis = 0.04;
var neck_height    = 0.30;
var neck_off_axis  = 0.12; // not sure if correct...

var add_mesh_buttons = function(){
  var request_btn   = document.getElementById('request_mesh_btn');
  var switch_btn    = document.getElementById('switch_mesh_btn');
  var clear_btn     = document.getElementById('clear_mesh_btn');
  var grabwheel_btn = document.getElementById('grabwheel_btn');
  var grabtool_btn  = document.getElementById('grabtool_btn');
  var three_btn        = document.getElementById('three_btn');

  // request a new mesh
  request_btn.addEventListener('click', function() {

    // if testing with the kinect
    var mesh_req_url = rest_root+'/m/vcm/'+mesh_in_use+'/net'
    if(mesh_in_use=='kinect'){
      mesh_req_url+='_depth';
    }

    var vals = [1,1,90];
    // perform the post request
    promise.post( mesh_req_url, {val:JSON.stringify(vals)} ).then(function(error, text, xhr) {
        if(error){ return; }
    });
  }, false);

  // switch the type of mesh to request
  switch_btn.addEventListener('click', function() {
    switch(switch_btn.textContent){
      case 'Head':
        switch_btn.textContent = "Chest";
        mesh_in_use = 'chest_lidar';
        draw_jet_map(chest_mesh_raw_ctx);
        break;
      case 'Chest':
        switch_btn.textContent = "Head";
        mesh_in_use = 'head_lidar';
        draw_jet_map(head_mesh_raw_ctx);
        break;
      default:
        switch_btn.textContent = "Kinect";
        mesh_in_use = 'kinect';
        break;
    }
    // clear the clicked points
    mesh_points = [];
    mesh_clicks = [];
    mesh_svg.selectAll("circle")
    .data(mesh_clicks).exit().remove()
  }, false);

  // Clear the points on the mesh
  clear_btn.addEventListener('click', function() {
    mesh_points = [];
    mesh_clicks = [];
    mesh_svg.selectAll("circle")
    .data(mesh_clicks).exit().remove()
  }, false);

  // Calculate where the wheel is; send to the robot
  grabwheel_btn.addEventListener('click', function() {
    var wheel = calculate_wheel(mesh_points);
    console.log('Wheel',wheel);
    if(wheel===undefined){return;}
    var wheel_url = rest_root+'/m/hcm/wheel/model'
    // perform the post request
    promise.post( wheel_url, {val:JSON.stringify(wheel)} ).then(function(error, text, xhr) {
        if(error){ return; }
    });
  }, false);

  // Place into 3D coordinates
  // Check that the 3D environment exists...
  if(mesh_to_three!==undefined){
    three_btn.addEventListener('click', function() {
      mesh_to_three(chest_mesh_raw_ctx,[mesh_width,mesh_height]);
    }, false);
  }

}

var get_hokuyo_xyz = function(u,v,w,width,height,near,far,hFOV,vFOV){
  //console.log(u,v,w,width,height,near,far,hFOV,vFOV);
  // radians per pixel
  var h_rpp = hFOV / width;
  var v_rpp = vFOV / height;
  // angle in radians of the selected pixel
  var h_angle = h_rpp * (width/2-u);
  var v_angle = v_rpp * (v-height/2);
  // Convert w of 0-255 to actual meters value
  var factor = (far-near)/255;
  var r = factor*w+near;

  // depth to world coordinates
  if(mesh_in_use=='head_lidar'){
    // make the local vector
    var point = new THREE.Vector4(
      r*Math.cos(h_angle),
      r*Math.sin(h_angle),
      neck_off_axis,
      0
    );
    // make the transform to global
    var local_to_global = new THREE.Matrix4();
    local_to_global.makeRotationY( v_angle );
    // apply transform so that local is now global
    point.applyMatrix4(local_to_global);
    // add the neck height offset from the torso
    point.z = point.z + neck_height;
  } else {
    r += chest_off_axis;

    // make the local vector
    var point = new THREE.Vector4(
      r*Math.cos(h_angle),
      r*Math.sin(h_angle),
      0,
      0
    );

    // find the x, y, z
    /*
    var x = r * Math.cos(v_angle) * Math.cos(h_angle) + chest_depth;
    var y = r * Math.cos(v_angle) * Math.sin(h_angle) + chest_height;
    var z = r * Math.sin(v_angle);
    */
    // make the transform to global
    var local_to_global = new THREE.Matrix4();
    local_to_global.makeRotationY( v_angle );
    // apply transform so that local is now global
    point.applyMatrix4(local_to_global);
    // add the chest offset from the torso
    point.x = point.x + chest_depth;
    point.z = point.z + chest_height;
  }

  // return the global point vector
  return point;
}

var get_kinect_xyz = function(u,v,w,width,height,near,far,hFOV,vFOV){
  // Convert w of 0-255 to actual meters value
  var factor = (far-near)/255;
  var x = factor*w+near;
  var y = Math.tan(hFOV/2)*2*(u/width-.5)*x;
  var z = Math.tan(vFOV/2)*2*(.5-v/height)*x;
  return new THREE.Vector3( x, y, z );
}

var mesh_click = function(e){
  //console.log(e);
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
      if(w==0||w==255){return;}
      point = get_hokuyo_xyz(u,v,w,
        mesh_width,mesh_height,
        mesh_depths[0],mesh_depths[1],
        mesh_fov[0],mesh_fov[1]
      );
      break;
    case 'chest_lidar':
      var w = chest_mesh_raw_ctx.getImageData(u, v, 1, 1).data[0];
      // do not use saturated pixels
      if(w==0||w==255){return;}
      point = get_hokuyo_xyz(u,v,w,
        mesh_width,mesh_height,
        mesh_depths[0],mesh_depths[1],
        mesh_fov[1],mesh_fov[0]
      );
      break;
    default:
      return;
  }
  
  console.log('World: ',point);
  
  // save the click
  mesh_clicks.push( new THREE.Vector3(u,v,w) );
  mesh_points.push( point );

  // the svg overlay has the circles for where we clicked
  var click_circles = mesh_svg.selectAll("circle")
  .data(mesh_clicks).enter()
  .append("circle").style("fill", "white")
  .attr("cx", function(p,i){
    return p.x;
  })
  .attr("cy", function(p,i){
    return p.y;
  })
  .attr("r", 4); // radius
  
  // attributes for new clicks
  // http://mbostock.github.io/d3/tutorial/circle.html

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

  draw_jet_map(raw_ctx);

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
      //console.log('mesh Latency: '+latency*1000+'ms',fr_metadata);
      mesh_depths = fr_metadata.depths.slice(0);
      mesh_fov[0] = fr_metadata.fov[1]-fr_metadata.fov[0];
      mesh_fov[1] = fr_metadata.scanlines[1]-fr_metadata.scanlines[0];
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
      mesh_img.alt = fr_metadata.name;
      // Trigger processing once the image is fully loaded
      mesh_img.onload = mesh_handler;
    }); //animframe
  };

}, false );

var draw_jet_map = function(raw_ctx){
  // clear the context
  //console.log(mesh_ctx);
  var w = mesh_ctx.canvas.width;
  var h = mesh_ctx.canvas.height;
  mesh_ctx.clearRect( 0 , 0 , 500 , 500 );

  // TODO: recolor to something that is not grey
  var rawDataImage = raw_ctx.getImageData(0, 0, w, h);
  var data = rawDataImage.data;
  for(var i = 0; i < data.length; i += 4) {
    // http://www.metastine.com/?p=7
    var fourValue = 4-(4/255 * data[i]);
    // red
    data[i] = 255*Math.min(fourValue - 1.5, -fourValue + 4.5);
    // green
    data[i+1] = 255*Math.min(fourValue - 0.5, -fourValue + 3.5);
    // blue
    data[i+2] = 255*Math.min(fourValue + 0.5, -fourValue + 2.5);
  }
  // overwrite original image
  mesh_ctx.putImageData(rawDataImage, 0, 0);
}

var add_depth_slider = function(){

  var margin = {top: 0, right: 12, bottom: 18, left: 12},
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
    var rpc_url = rest_root+'/m/vcm/'+mesh_in_use+'/depths'
    var vals = brush.extent();
    // perform the post request
    promise.post( rpc_url, {val:JSON.stringify(vals)} ).then(function(error, text, xhr) {
        if(error){ return; }
    });
  }
}