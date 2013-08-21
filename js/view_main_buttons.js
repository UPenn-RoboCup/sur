/* Buttons to update settings */
$(function() {
  $( "a#req_btn" ).button().click(function( event ) {
    event.preventDefault();
    var request = {loc: 'chest', quality: 95, range: [.1,2] }
    fr_ws.send( JSON.stringify(request) );
  });
});
/* Buttons to update settings */
$(function() {
  $( "a#dmap_btn" ).button().click(function( event ) {
    event.preventDefault();
    $( "#images" ).dialog("open");
  });
});
/* Buttons to update settings */
$(function() {
  $( "a#settings_btn" ).button().click(function( event ) {
    event.preventDefault();
    $( "#settings" ).dialog("open");
  });
});