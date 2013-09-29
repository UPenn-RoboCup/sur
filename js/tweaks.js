/* Buttons to update settings */
document.addEventListener( "DOMContentLoaded", function(){

  /* React to the body height slider */
  /*
  d3.select('#bodyheight_slider').call(

    // stylize the slider
    d3.slider().axis(
      d3.svg.axis().orient('right').ticks(6)
    )
    .orientation("vertical").min(1).max(.8).value(.9).step(0.0100)
    .on("slide", function(evt, value) {

      // ajax: perform the post request
      var req_url = rest_root+'/m/mcm/walk/bodyHeight';
      var req_val = JSON.stringify(value);
      promise.post( req_url, {val:req_val} ).then(function(error, text, xhr) {
          if(error){ return; }
      });

  }));
*/
/*
var w = 200;
var h = 100;

  var margin = {top: 20, right: 50, bottom: 20, left: 50},
      width = w - margin.left - margin.right,
      height = h - margin.bottom - margin.top;

// scaling setup
  var x = d3.scale.linear()
      .domain([0, 30])
      .range([0, width])
      .clamp(true);

// make brush functionality
  var brush = d3.svg.brush()
      .x(x)
      .extent([0, 0])
      .on("brush", brushed);

  var high_brush = d3.svg.brush()
      .x(x)
      .extent([10, 10])
      .on("brush", brushed);

// make the svg container
  var svg = d3.select("body").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// draw the axis numbers
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height / 2 + ")")
      .call(
        d3.svg.axis()
        .scale(x)
        .tickValues([0,5,10,20,30])
        .orient("bottom")
        .tickFormat(function(d) { return d + "m"; })
        .tickSize(0)
        .tickPadding(12)
      )
    .select(".domain")
    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
      .attr("class", "halo");

  // add the slider
  var slider = svg.append("g")
      .attr("class", "slider")
      .call(brush);

  var high_slider = svg.append("g")
      .attr("class", "slider")
      .call(high_brush);

  slider.selectAll(".extent,.resize")
      .remove();
  slider.select(".background")
      .attr("height", height);

  high_slider.selectAll(".extent,.resize")
      .remove();
  high_slider.select(".background")
      .attr("height", height);

  var handle = slider.append("circle")
      .attr("class", "handle")
      .attr("transform", "translate(0," + height / 2 + ")")
      .attr("r", 9);

  var high_handle = high_slider.append("circle")
      .attr("class", "handle")
      .attr("transform", "translate(0," + height / 2 + ")")
      .attr("r", 9);


  slider
      .call(brush.event)
    .transition() // gratuitous intro!
      .duration(750)
      .call(brush.extent([70, 70]))
      .call(brush.event);


  function brushed() {
    var value = brush.extent()[0];

    if (d3.event.sourceEvent) { // not a programmatic event
      value = x.invert(d3.mouse(this)[0]);
      brush.extent([value, value]);
    }

    handle.attr("cx", x(value));
    d3.select("body").style("background-color", d3.hsl(value, .8, .8));
  }

*/

var data = d3.range(800).map(Math.random);

var margin = {top: 0, right: 25, bottom: 20, left: 25},
    width = 300 - margin.left - margin.right,
    height = 40 - margin.top - margin.bottom;

var x = d3.scale.linear()
    .range([0, width]);

var y = d3.random.normal(height / 2, height / 8);

var brush = d3.svg.brush()
    .x(x)
    .extent([.3, .5])
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

var circle = svg.append("g").selectAll("circle")
    .data(data)
  .enter().append("circle")
    .attr("transform", function(d) { return "translate(" + x(d) + "," + y() + ")"; })
    .attr("r", 3.5);

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
  svg.classed("selecting", true);
}

function brushmove() {
  var s = brush.extent();
  circle.classed("selected", function(d) { return s[0] <= d && d <= s[1]; });
}

function brushend() {
  svg.classed("selecting", !d3.event.target.empty());
}


}); // DOM loaded