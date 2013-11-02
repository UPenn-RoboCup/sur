// Useful (globally accessible) functions
if(this.document!==undefined){
  this.host = this.document.location.host.replace(/:.*/, '');
  if( host.length==0 ){ host = "localhost"; }
  // Compatibility layer for URL
  this.URL = this.URL || this.webkitURL;
  // assume port 8080 for testing...
  this.rest_root = 'http://'+host+':8080';
  // http://macwright.org/presentations/dcjq/
  this.$ = function(x){return document.querySelectorAll(x);};
  this.clicker = function(id,fun){
    document.getElementById(id).addEventListener('click', fun, false);
  }
  this.unclicker = function(id,fun){
    document.getElementById(id).removeEventListener('click', fun, false);
  }
}