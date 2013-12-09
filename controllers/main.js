// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  
  // Setup the world
  World.setup();
  Mesh.setup();
  Robot.setup();
  
  // Add items to be manipulated
  Manipulation.add_item(Waypoint);
  Manipulation.add_item(Hand);
  Manipulation.add_item(Hose);
  Manipulation.add_item(Wye);
  Manipulation.add_item(SmallValve);
  Manipulation.add_item(LargeValve);
  Manipulation.add_item(BarValve);
  Manipulation.add_item(Door);
  Manipulation.add_item(Tool);
  Manipulation.setup();
  
  // Setup the GUI
  clicker('modify_obj',Manipulation.modify);
  clicker('loop_obj',Manipulation.loop);
  //
  clicker('robot_show',Robot.show);
  clicker('robot_hide',Robot.hide);
  // Clearing the meshes
  clicker('wipe_mesh',World.clear_meshes);
  // During walking
  clicker('fast_mesh',function() {
    qwest.post(rest_root+'/m/vcm/chest_lidar/scanlines',{
      val: JSON.stringify([-1.0472, 1.0472, 2/DEG_TO_RAD])
    });
  });
  // During manipulation
  clicker('slow_mesh',function() {
    qwest.post(rest_root+'/m/vcm/chest_lidar/scanlines',{
      val: JSON.stringify([-1.0472, 1.0472, 5/DEG_TO_RAD])
    });
  });
  // Chest mesh: reliable single PNG
  clicker('request_mesh',function() {
    // if testing with the kinect
    qwest.post( rest_root+'/m/vcm/chest_lidar/net',{
      val:JSON.stringify([3,3,90,1])
    });
  });
  // Chest mesh: reliable interval PNG
  clicker('stream_mesh',function() {
    // if testing with the kinect
    qwest.post( rest_root+'/m/vcm/chest_lidar/net',{
      val:JSON.stringify([4,3,90,1])
    });
  });
  // Slider for mesh depth ranges
  (function(){
    function brushend() {
      // Done moving
      qwest.post( rest_root+'/m/vcm/chest_lidar/depths',{
        val:JSON.stringify(brush.extent())
      });
    }
    // D3 settings
    var margin = {top: 0, right: 12, bottom: 18, left: 12},
        width = 170 - margin.left - margin.right,
        height = 36 - margin.top - margin.bottom;
    var x = d3.scale.pow().exponent(.5).range([0, width]).domain([0, 30]);
    var y = d3.random.normal(height / 2, height / 8);
    // Make the handle
    var arc = d3.svg.arc()
        .outerRadius(height / 2)
        .startAngle(0)
        .endAngle(function(d, i) { return i ? -Math.PI : Math.PI; });
    var svg = d3.select("#vision").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.svg.axis().scale(x).orient("bottom")
        .tickValues([.2,1,3,5,10,20,30]).tickFormat(d3.format("g"))
      );
    // Make the brush
    var brush = d3.svg.brush().x(x).extent([.5, 3]).on("brushend", brushend);
    var brushg = svg.append("g")
        .attr("class", "brush")
        .call(brush);
    brushg.selectAll(".resize").append("path")
        .attr("transform", "translate(0," +  height / 2 + ")")
        .attr("d", arc);
    brushg.selectAll("rect")
        .attr("height", height);
    // Call immediately to set on the robot the desired ranges on the robot
    brushend();
  })();
  
  // Proceed buttons
  var rpc_url_proceed = rest_root+'/m/hcm/state/proceed'
  clicker('proceed_reverse',function(){
    qwest.post( rpc_url_proceed, {val:JSON.stringify(-1)} )
  });
  clicker('proceed_proceed',function(){
    qwest.post( rpc_url_proceed, {val:JSON.stringify(1)} )
  });
  clicker('proceed_notify',function(){
    qwest.post( rpc_url_proceed, {val:JSON.stringify(2)} )
  });
  
  // Vantage points (Position then target)
  clicker('vantage_top',function() {
    var cur = Robot.get_root();
    var position = cur.p.toArray();
    position[1] = 2000;
    var target = cur.p.toArray();
    target[2] += 50;
    World.set_view(position,target);
  });
  clicker('vantage_chest',function() {
    var cur = Robot.get_root();
    var position = cur.p.toArray();
    var target = cur.p.toArray();
    target[2] += 1000;
    World.set_view(position,target);
  });
  clicker('vantage_robot',function(){
    World.set_view('robot');
  });
  clicker('vantage_item',function() {
    var view = World.get_view();
    var item = Manipulation.get_item();
    var target = item.get_mod_mesh().position.toArray();
    World.set_view(view.position,target);
  });

/*
  // Camera settings
  clicker('stream_cam',function(){
    // Request the stream be enabled
    this.classList.remove('record');
    this.classList.add('special');
    qwest.post( rpc_url, {val:JSON.stringify([4,1,75,1])} );
  });
  clicker('single_cam',function(){
    // Perform a single frame request
    stream_cam.classList.remove('special');
    stream_cam.classList.add('record');
    qwest.post( rpc_url, {val:JSON.stringify([3,1,95,1])} );
  });
*/
  /*
  // stats
  var stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  $('body')[0].appendChild( stats.domElement );
  */
  
  // begin animation
  (function animloop(){
    World.render();
    //stats.update();
    requestAnimationFrame(animloop);
  })();

});