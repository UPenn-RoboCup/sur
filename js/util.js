// Find the right host
var host = window.document.location.host.replace(/:.*/, '');
if( host.length==0 ){ host = "localhost"; }
// Compatibility layer for URL
var URL = window.URL || window.webkitURL;
// assume port 8080 for testing...
var rest_root = 'http://'+host+':8080';