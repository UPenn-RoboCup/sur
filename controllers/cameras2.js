// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  // Set up the camera
  Camera2.setup();
  Vision.setup();
  
  // Place on the page
  var camera_container = $('#camera2_container')[0];
  var img = Camera2.get_image();
  camera_container.appendChild( img );
  
  var speed_url = rest_root+'/m/vcm/forehead_camera/net';
  clicker('head_slow',function(){
    qwest.post(speed_url,{val: JSON.stringify([2,1,30,1])});
  });
  clicker('head_single',function(){
    qwest.post(speed_url,{val: JSON.stringify([3,1,75,1])});
  });
  clicker('head_stop',function(){
    qwest.post(speed_url,{val: JSON.stringify([0,1,40,1])});
  });
  
  
  // Buttons for debug message display
  clicker('ball',function(){ OVERLAY = "ball"; });
  clicker('goal',function(){ OVERLAY = "goal"  });
  clicker('line',function(){ OVERLAY = "line"  });
  
  // Buttons for head FSMs
  clicker('head_center',function(){
    qwest.post(fsm_url,{fsm: 'HeadFSM' , evt: 'center'});
  });
  clicker('detect_ball',function(){
    qwest.post(fsm_url,{fsm: 'HeadFSM' , evt: 'scan'});
  });  
  
  // Tweak the left hand (optionally change the right)
  clicker('roll_up',function(){
    qwest.get(body_url,{body: 'get_rarm_command_position'}).success(function(pos){
      console.log('Position:',pos);
      pos[6]+=.1;
      qwest.post(body_url,{body: 'set_rarm_command_position',bargs: JSON.stringify(pos)});
    });
  });
  clicker('roll_down',function(){
    qwest.get(body_url,{body: 'get_rarm_command_position'}).success(function(pos){
      console.log('Position:',pos);
      pos[6]-=.1;
      qwest.post(body_url,{body: 'set_rarm_command_position',bargs: JSON.stringify(pos)});
    });
  });
  //
  clicker('pitch_up',function(){
    qwest.get(body_url,{body: 'get_rarm_command_position'}).success(function(pos){
      console.log('Position:',pos);
      pos[5]-=.05;
      qwest.post(body_url,{body: 'set_rarm_command_position',bargs: JSON.stringify(pos)});
    });
  });
  clicker('pitch_down',function(){
    qwest.get(body_url,{body: 'get_rarm_command_position'}).success(function(pos){
      console.log('Position:',pos);
      pos[5]+=.05;
      qwest.post(body_url,{body: 'set_rarm_command_position',bargs: JSON.stringify(pos)});
    });
  });

});