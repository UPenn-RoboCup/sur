// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  
  // Store the DOM elements
  var qL_arm = [];
  var qL_min = [-90, 0, -90, -160,      -180,-87,-180,];
  var qL_max = [160,87,90,-25,     180,87,180,];
  for(var i=0;i<7;i++){
    var el = $('#qL'+(i+1))[0];
    el.min = (qL_min[i]*DEG_TO_RAD).toString();
    el.max = (qL_max[i]*DEG_TO_RAD).toString();
    qL_arm[i] = el;
  }
  //
  var qR_arm = [];
  var qR_min = [-90,-87,-90,-160,       -180,-87,-180];
  var qR_max = [160,-0,90,-25,     180,87,180,];
  for(var i=0;i<7;i++){
    var el = $('#qR'+(i+1))[0];
    el.min = (qR_min[i]*DEG_TO_RAD).toString();
    el.max = (qR_max[i]*DEG_TO_RAD).toString();
    qR_arm[i] = el;
  }
  //
  var qW_waist = [];
  var qW_min = [-90,-45];
  var qW_max = [90,45];
  for(var i=0;i<2;i++){
    var el = $('#qW'+(i+1))[0];
    el.min = (qW_min[i]*DEG_TO_RAD).toString();
    el.max = (qW_max[i]*DEG_TO_RAD).toString();
    qW_waist[i] = el;
  }
  
  // Send commands to the robot
  clicker('larm_go',function(){
    // Form the argument
    var bargs = [0,0,0, 0,0,0, 0];
    for(var i=0;i<7;i++){bargs[i] = qL_arm[i].valueAsNumber;}
    // Send to the robot
    qwest.post(body_url,{body: 'set_larm_command_position',bargs: JSON.stringify(bargs)});
  });
  var qL_reset = function(){
    // Get from the robot
    qwest.get(body_url,{body: 'get_larm_command_position'}).success(function(v){
      for(var i=0;i<7;i++){
        qL_arm[i].value=v[i].toString();
      }
    })
  }
  clicker('larm_reset',qL_reset);
  
  //
  clicker('rarm_go',function(){
    // Form the argument
    var bargs = [0,0,0, 0,0,0, 0];
    for(var i=0;i<7;i++){bargs[i] = qR_arm[i].valueAsNumber;}
    // Send to the robot
    qwest.post(body_url,{body: 'set_rarm_command_position',bargs: JSON.stringify(bargs)});
  });
  var qR_reset = function(){
    // Get from the robot
    qwest.get(body_url,{body: 'get_rarm_command_position'}).success(function(v){
      for(var i=0;i<7;i++){
        qR_arm[i].value=v[i].toString();
      }
    });
  }
  clicker('rarm_reset',qR_reset);
  
  // Waist
  clicker('waist_go',function(){
    // Form the argument
    var bargs = [0,0,0, 0,0,0, 0];
    for(var i=0;i<2;i++){bargs[i] = qW_waist[i].valueAsNumber;}
    // Send to the robot
    qwest.post(body_url,{body: 'set_waist_command_position',bargs: JSON.stringify(bargs)});
  });
  var qW_reset = function(){
    // Get from the robot
    qwest.get(body_url,{body: 'get_waist_command_position'}).success(function(v){
      for(var i=0;i<2;i++){
        qW_waist[i].value=v[i].toString();
      }
    });
  }
  clicker('waist_reset',qW_reset);
  
  
  
  
  qL_reset();
  qR_reset();
  
});