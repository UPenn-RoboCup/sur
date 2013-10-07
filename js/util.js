// Find the right host
//console.log(this);
//console.log(window);
var host, rest_root, URL;
if(window!==undefined){
  host = window.document.location.host.replace(/:.*/, '');
  if( host.length==0 ){ host = "localhost"; }
  // Compatibility layer for URL
  URL = window.URL || window.webkitURL;
  // assume port 8080 for testing...
  rest_root = 'http://'+host+':8080';
}
