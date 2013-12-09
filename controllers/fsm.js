document.addEventListener( "DOMContentLoaded", function(){
  // Attach click bindings to the FSM buttons
  var a = $('#fsm a');
  for(var i=0, j=a.length; i<j; i++){
    var btn = a[i];
    var id  = btn.id;
    // Grab is a special button
    if(id=='arm_grab'){continue;}
    var sep = id.indexOf('_');
    var evt = id.substring(sep+1);
    var sm = id.substring(0,sep);
    var fsm = sm.charAt(0).toUpperCase() + sm.slice(1) + 'FSM';
    // Add the listener
    if(fsm=='BodyFSM'&&evt=='follow'){
      clicker(btn,
      (function(){
        var wp_url = rest_root+'/m/hcm/motion/waypoints';
        var wp = Waypoint.get_robot();
        var b_evt = this.evt, b_fsm = this.fsm;
        // Send the waypoint
        qwest.post( wp_url, {val:JSON.stringify(wp)} )
        .complete(function(){
          // Then send the follow event!
          qwest.post(fsm_url,{fsm: b_fsm, evt: b_evt});
        });
      }).bind({evt:evt,fsm:fsm})
      );
    } else {
      clicker(btn,
      (function(){
        qwest.post(fsm_url,{fsm: this.fsm , evt: this.evt});
      }).bind({evt:evt,fsm:fsm})
    );
    }
  } // for each
  

},false);