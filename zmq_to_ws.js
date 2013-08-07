/***
* SUR: Data forwarding
* (c) Stephen McGill, 2013
*/

/**
* Load configuration values
*/
var zmq_send_ch = ['from_operator', 'to_mesh'];
var zmq_recv_ch = ['to_operator',   'from_mesh'];
var ws_names    = ['operator',      'mesh'];
var ws_ports    = [9001,            9002];
var ws_servers  = new Array(ws_ports.length);
/* Only allow one client (the latest one) */
var ws_clients  = new Array(ws_ports.length);
/* Allow reverse lookup */
var ws_name_reverse  = {};
for(var w=0;w<ws_names.length;w++){
  ws_name_reverse[ws_names[w]] = w;
  ws_clients[w] = null;
}
var zmq_receivers = new Array(ws_names.length);
/* Only allow one client (the latest one) */
var zmq_senders   = new Array(ws_names.length);

/* NOTE: Everything after this is the same for each port forward */

/**
* Global state variables
*/

/***
* Communication with the robot uses ZeroMQ
* Metadata is messagepack'd
* Communication with the web browser uses websockets
*/
var zmq = require('zmq');
var mp  = require('msgpack');
var WebSocketServer = require('ws').Server;


/***************
* WebSocket user request handling
*/
var ws_error = function(e){
	if(e!==undefined){ console.log('Error:',e); }
}
/* Initialize the websocket servers for each port */
for( var w=0; w<ws_servers.length; w++) {
  
  /* Initialize the server */
  var wss = new WebSocketServer({port: ws_ports[w]});
  /* Save which socket this is */
  var ws_id = w;
  /* Get a connection from a user */
  wss.on('connection', function(ws) {
    
    /* Web Browser Message */
    ws.on('message', function(message) {
      /* Accept JSON broswer commands and no binary */
      var cmd = JSON.parse(message);
      console.log('Browser ' + cmd.type + ' | ', cmd);
      /* Pack as MessagePack for use by the robot, and send on the socket */
      var mp_cmd = mp.pack(cmd);
      console.log('Forwarding to '+zmq_send_ch[ws_id]+' '+mp_cmd.length+' bytes.')
      zmq_senders[ws_id].send(mp_cmd);
    });
    
    /* Save this web socket connection */
    ws_clients[ws_id] = ws;
    
    console.log('User is connected to',ws_names[ws_id]);
    
  }); // on connection
  
  ws_servers[w] = wss;
  
} // for loop

/***************
* ZeroMQ robot data receiving
*/
for( var w=0; w<ws_servers.length; w++) {
  
  var zmq_send_skt = zmq.socket('pub');
  zmq_send_skt.bind('ipc:///tmp/'+zmq_send_ch[w]);
  console.log('ZeroMQ IPC | Bound to '+zmq_send_ch[w]);
  zmq_senders[w] = zmq_send_skt

  var zmq_recv_skt = zmq.socket('sub');
  zmq_recv_skt.connect('ipc:///tmp/'+zmq_recv_ch[w]);
  zmq_recv_skt.subscribe('');
  console.log('ZeroMQ IPC | Connected to '+zmq_recv_ch[w]);

  var ws_id = w;

  zmq_recv_skt.on('message', function(metadata,payload){
    var meta = mp.unpack(metadata);
    /* Add the payload sz parameter to the metadata */
    if(payload!==undefined){
      meta.sz = payload.length;
    } else {
      meta.sz = 0;
    } // if a payload

    /* Provide Debugging information */
    console.log('Robot ZMQ | ', ws_id);
    var ws = ws_clients[ws_id];
    if( ws != null ){
      /* Browser expects JSON metadata, sent as a string */
      var str = JSON.stringify(meta);
      ws.send(str,ws_error);
      /* Follow the metadata with the binary payload (if it exists) */
      if(meta.sz>0){
        ws.send(payload,{binary: true},ws_error);
      } // if a payload
      console.log('Sent to browser!');
    } // if not null

  });

} // for w