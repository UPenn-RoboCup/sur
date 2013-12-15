// Once the page is done loading, execute main
document.addEventListener( "DOMContentLoaded", function(){
  
  Speaker.setup();
         
  // Right Trigger
  clicker('rt_trigger',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: 200});
    qwest.post(rest_root+'/m/hcm/audio/request',{val: JSON.stringify([1])});
  });
  clicker('rt_hold',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: 50});
  });
  clicker('rt_open',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: -10});
  });
  clicker('rt_loose',function(){
    qwest.post(body_url,{body: 'move_rgrip1',bargs: 0});
  });
  
  // Right Grip
  clicker('rg_trigger',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: 200});
  });
  clicker('rg_hold',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: 50});
  });
  clicker('rg_open',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: -10});
  });
  clicker('rg_loose',function(){
    qwest.post(body_url,{body: 'move_rgrip2',bargs: 0});
  });
  
  // Left Trigger
  clicker('lt_trigger',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: 200});
  });
  clicker('lt_hold',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: 50});
  });
  clicker('lt_open',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: -10});
  });
  clicker('lt_loose',function(){
    qwest.post(body_url,{body: 'move_lgrip1',bargs: 0});
  });
  
  // Left Grip
  clicker('lg_trigger',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: 200});
  });
  clicker('lg_hold',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: 50});
  });
  clicker('lg_open',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: -10});
  });
  clicker('lg_loose',function(){
    qwest.post(body_url,{body: 'move_lgrip2',bargs: 0});
  });
  
});