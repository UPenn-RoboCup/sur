var xx;
// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  
  // Store the DOM elements
  var qlarm = [];
  var qL_min = [-90, 0, -90, -160,      -180,-87,-180,];
  var qL_max = [160,87,90,-25,     180,87,180,];
  for(var i=0;i<7;i++){
    var el = $('#qL'+(i+1))[0];
    el.min = (qL_min[i]*DEG_TO_RAD).toString();
    el.max = (qL_max[i]*DEG_TO_RAD).toString();
    qlarm[i] = el;
  }
  
  // Send commands to the robot
  clicker('larm_go',function(){
    // Form the argument
    var bargs = [0,0,0, 0,0,0, 0];
    for(var i=0;i<7;i++){bargs[i] = qlarm[i].valueAsNumber;}
    // Send to the robot
    qwest.post(body_url,{body: 'set_larm_command_position',bargs: JSON.stringify(bargs)});
  });
  clicker('larm_reset',function(){
    // Get from the robot
    qwest.get(body_url,{body: 'get_larm_command_position'}).success(function(v){
      console.log('val',v);
      for(var i=0;i<7;i++){
        console.log(qlarm[i]);
        qlarm[i].value=v[i].toString();
        xx = qlarm[i];
      }
    })
    
    
    
  });
});