/* Buttons to update settings */
document.addEventListener( "DOMContentLoaded", function(){

  /* React to the body height slider */
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

}); // DOM loaded