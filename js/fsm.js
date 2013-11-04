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
    
  };
  
  // export
	ctx.FSM = FSM;
  
})(this);