// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  
  Speaker.setup();
         
  // Right Trigger
  clicker('rt_trigger',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: 200});
    qwest.post(rest_root+'/m/hcm/audio/request',{val: JSON.stringify([1])});
  });
  clicker('rt_hold',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: 50});
  });
  clicker('rt_open',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: -10});
  });
  clicker('rt_loose',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: 0});
  });
  
  // Right Grip
  clicker('rg_trigger',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: 200});
  });
  clicker('rg_hold',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: 50});
  });
  clicker('rg_open',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: -10});
  });
  clicker('rg_loose',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: 0});
  });
  
  // Left Trigger
  clicker('lt_trigger',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: 200});
  });
  clicker('lt_hold',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: 50});
  });
  clicker('lt_open',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: -10});
  });
  clicker('lt_loose',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: 0});
  });
  
  // Left Grip
  clicker('lg_trigger',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: 200});
  });
  clicker('lg_hold',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: 50});
  });
  clicker('lg_open',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: -10});
  });
  clicker('lg_loose',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: 0});
  });
  
  // Feedback...
  var port = 9013;
  // Connect to the websocket server
  var ws = new WebSocket('ws://' + host + ':' + port);
  var t0 = -1;
  // Should not need this...
  ws.binaryType = "arraybuffer";
  ws.onmessage = function(e){
    //console.log(e);
    var feedback = JSON.parse(e.data);
    //console.log(feedback)
    var r_gpos = feedback.r_gpos
    var l_gpos = feedback.l_gpos
    var r_temp = feedback.r_temp
    var l_temp = feedback.l_temp
    var r_load = feedback.r_load
    var l_load = feedback.l_load
    // Update the initial time
    if(t0<0){t0 = feedback.t;}
    // Enter data to the chart
    
    data.shift();
      data.push({time:feedback.t-t0,value:r_temp[0]});
      redraw();
      //console.log(data)
    
  }
  
  
  /////// D3 ///////
  var w = 20, h = 80;
  var data = [];
  for(var i=0;i<30;i++){
    data.push({time:i-30,value:0});
  }

  var x = d3.scale.linear()
  .domain([0, 1])
  .range([0, w]);

  var y = d3.scale.linear()
  .domain([0, Math.PI])
  
  var chart = d3.select("body").append("svg")
       .attr("class", "chart")
       .attr("width", w * data.length - 1)
       .attr("height", h)

  chart.selectAll("rect")
      .data(data)
    .enter().append("rect")
      .attr("x", function(d, i) { return x(i) - .5; })
      .attr("y", function(d) { return h - y(d.value); })
      .attr("width", w)
      .attr("height", function(d) { return y(d.value); })
      .style("stroke", "#0ff")
      .style("fill", "#aaa");
       
       chart.append("line")
            .attr("x1", 0)
            .attr("x2", w * data.length)
            .attr("y1", h - .5)
            .attr("y2", h - .5)
            .style("stroke", "#00f");
  
  
            function redraw() { 
               var rect = chart.selectAll("rect")
                   .data(data, function(d) { return d.time; });
   
               rect.enter().insert("rect", "line")
                   .attr("x", function(d, i) { return x(i + 1) - .5; })
                   .attr("y", function(d) { 
                     //return h - y(d.value) - .5; 
                     return h - y(d.value);
                   })
                   .attr("width", w)
                  .attr("height", function(d) { return y(d.value); })
                .transition()
                  .duration(100)
                  .attr("x", function(d, i) { return x(i) - .5; });
  
              rect.transition()
                  .duration(100)
                  .attr("x", function(d, i) { return x(i) - .5; });
  
              rect.exit().transition()
                  .duration(100)
                  .attr("x", function(d, i) { return x(i - 1) - .5; })
                  .remove();
  
            }
  
});