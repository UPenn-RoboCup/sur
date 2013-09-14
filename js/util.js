// Find the right host
var host = window.document.location.host.replace(/:.*/, '');
if( host.length==0 ){ host = "localhost"; }
// Compatibility layer for URL
var URL = window.URL || window.webkitURL;
var $ = Sizzle;