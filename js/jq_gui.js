/* Buttons to update settings */
$(function() {

// request image
$( "a#request_btn" ).button().click(function( event ) {
event.preventDefault();
var rpc_url = 'http://'+host+':8080/m/vcm/kinect/net_depth'
var vals = [1,1,90,2];
$.post(rpc_url,{val:JSON.stringify(vals)},function(){
	console.log('done');
});
});

// update the dipole in the three scene
$( "a#dipole_btn" ).button().click(function( event ) {
event.preventDefault();

});

});
