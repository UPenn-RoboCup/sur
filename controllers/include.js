// Useful (globally accessible) functions
this.host = this.document.location.host.replace(/:.*/, '');
if( host.length==0 ){ host = "localhost"; }
// Compatibility layer for URL
this.URL = this.URL || this.webkitURL;
// assume port 8080 for testing...
this.rest_root = 'http://'+host+':8080';
this.fsm_url  = rest_root+'/s';
this.body_url = rest_root+'/b';
// Override get/set
this.so_url = rest_root+'/m/hcm/state/override_target';
this.go_url = rest_root+'/m/hcm/state/override';
this.rpc_url_proceed = rest_root+'/m/hcm/state/proceed';
// http://macwright.org/presentations/dcjq/
this.$ = function(x){return document.querySelectorAll(x);};
this.clicker = function(id,fun){
  if(typeof id==='string'){
    var id_el = document.getElementById(id);
    if(id_el==null){return false;}
    return Hammer(id_el).on('tap',fun);
  }
  if(id==null||id===undefined){return false;}
  return Hammer(id).on('tap',fun);
}
this.unclicker = function(id,fun){
  if(typeof id==='string'){
    var id_el = document.getElementById(id);
    if(id_el==null){return false;}
    return Hammer(id_el).off('tap',fun);
  }
  if(id==null||id===undefined){return false;}
  return Hammer(id).off('tap',fun);
}
this.DEG_TO_RAD = Math.PI/180;
this.RAD_TO_DEG = 180/Math.PI;