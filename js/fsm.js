
(function(ctx){
  
  // Function to hold methods
  function FSM(){}
  
  // State Machine root url
  var req_url = rest_root+'/s';

  FSM.setup = function(){
    // Head
    clicker('head_fsm_scan_btn',function() {
      qwest.post( req_url, {fsm: 'HeadFSM' , evt: 'tiltscan'} );
    });
    clicker('head_fsm_center_btn',function() {
      qwest.post( req_url, {fsm: 'HeadFSM' , evt: 'center'} );
    });

    // Arm
    clicker('head_fsm_init_btn',function() {
      qwest.post( req_url, {fsm: 'HeadFSM' , evt: 'init'} );
    });
    clicker('head_fsm_ready_btn',function() {
      qwest.post( req_url, {fsm: 'ArmFSM' , evt: 'ready'} );
    });
    clicker('head_fsm_reset_btn',function() {
      qwest.post( req_url, {fsm: 'ArmFSM' , evt: 'reset'} );
    });
    clicker('head_fsm_grab_btn',function() {
      qwest.post( req_url, {fsm: 'ArmFSM' , evt: 'grab'} );
    });
  
    // Motion
    clicker('motion_fsm_stand_btn',function() {
      qwest.post( req_url, {fsm: 'MotionFSM' , evt: 'stand'} );
    });
    clicker('motion_fsm_walk_btn',function() {
      qwest.post( req_url, {fsm: 'MotionFSM' , evt: 'walk'} );
    });

    // Body
    clicker('body_fsm_init_btn',function() {
      qwest.post( req_url, {fsm: 'BodyFSM' , evt: 'init'} );
    });
    clicker('body_fsm_follow_btn',function() {
      // Set the waypoints and send the follow event
      qwest.post(
        rest_root+'/m/hcm/motion/waypoints',
        {val:JSON.stringify(waypoints)})
      .success(function(response){
        qwest.post( req_url, {fsm: 'BodyFSM' , evt: 'follow'} );
       });
    });
    clicker('body_fsm_step_btn',function() {
      qwest.post( req_url, {fsm: 'BodyFSM' , evt: 'stepover'} );
    });
  };
  
  // export
	ctx.FSM = FSM;
  
})(this);