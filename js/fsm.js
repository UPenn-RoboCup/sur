(function(ctx){
  
  // Function to hold methods
  function FSM(){}
  
  // State Machine root url
  var req_url = rest_root+'/s';

  FSM.setup = function(){
    // Head
    var head_fsm_btns = $('.headfsm a');
    for(var i=0,j=head_fsm_btns.length;i<j;i++){
      var btn = head_fsm_btns[i];
      // Get the event, with no whitespaces
      var btn_id = btn.id.replace(/\s/g, "");
      var evt = btn_id.substring(9,btn_id.length-4);
      // Add the listener
      clicker(
        btn.id,
        (function(){qwest.post(req_url,{fsm: 'HeadFSM' , evt: this.evt});})
        .bind({evt: evt})
      );
    }// for
    
    // Arm
    var arm_fsm_btns = $('.armfsm a');
    for(var i=0,j=arm_fsm_btns.length;i<j;i++){
      var btn = arm_fsm_btns[i];
      // Get the event, with no whitespaces
      var btn_id = btn.id.replace(/\s/g, "");
      var evt = btn_id.substring(8,btn_id.length-4);
      // Add the listener
      clicker(
        btn.id,
        (function(){qwest.post(req_url,{fsm: 'ArmFSM', evt: this.evt});})
        .bind({evt: evt})
      );
    }// for

    // Body
    var body_fsm_btns = $('.bodyfsm a');
    for(var i=0,j=body_fsm_btns.length;i<j;i++){
      var btn = body_fsm_btns[i];
      // Get the event, with no whitespaces
      var btn_id = btn.id.replace(/\s/g, "");
      var evt = btn_id.substring(9,btn_id.length-4);
      // Add the listener
      clicker(
        btn.id,
        (function(){qwest.post(req_url,{fsm: 'BodyFSM' , evt: this.evt});})
        .bind({evt: evt})
      );
    }// for
    
    // Mesh
    var scanlines_val = [-1.0472, 1.0472, 5/DEG_TO_RAD];
    qwest.get(rest_root+'/m/vcm/chest_lidar/scanlines')
    .success( function(response){
      scanlines_val = response.slice();
    });
    clicker('fast_mesh_btn',function() {
      scanlines_val[2] = 2/DEG_TO_RAD;
      qwest.post(rest_root+'/m/vcm/chest_lidar/scanlines',{val: JSON.stringify(scanlines_val)});
    });
    clicker('medium_mesh_btn',function() {
      scanlines_val[2] = 5/DEG_TO_RAD;
      qwest.post(rest_root+'/m/vcm/chest_lidar/scanlines',{val: JSON.stringify(scanlines_val)});
    });
    clicker('slow_mesh_btn',function() {
      scanlines_val[2] = 10/DEG_TO_RAD;
      qwest.post(rest_root+'/m/vcm/chest_lidar/scanlines',{val: JSON.stringify(scanlines_val)});
    });
    
  };
  
  // export
	ctx.FSM = FSM;
  
})(this);