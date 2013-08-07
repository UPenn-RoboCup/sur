/***
* SUR: Data forwarding
* (c) Stephen McGill, 2013
*/

/**
* Load configuration values
*/
var zmq_send_ch = ['from_operator', 'to_mesh',   'to_rgbd'  ];
var zmq_recv_ch = ['to_operator',   'from_mesh', 'from_rgbd'];
var ws_names    = ['operator',      'mesh',      'rgbd'     ];
var ws_ports    = [9001,            9002,        9003       ];

var ws_servers  = new Array(ws_ports.length);
/* Only allow one client (the latest one) */
var ws_clients  = new Array(ws_ports.length);
/* Allow reverse lookup */
var ws_name_reverse  = {};
for(var w=0;w<ws_names.length;w++){
  ws_name_reverse[ws_names[w]] = w;
  ws_clients[w] = null;
}
/* Only allow one client (the latest one) */
var zmq_receivers = new Array(ws_names.length);
var zmq_senders   = new Array(ws_names.length);

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
  console.log(ws_ports[w]);
  var wss = new WebSocketServer({port: ws_ports[w]});
  wss.id = w;
  /* Save which socket this is */
  /* Get a connection from a user */
  wss.on('connection', function(ws) {
    ws.id = this.id;
    /* Web Browser Message */
    ws.on('message', function(message) {
      /* Accept JSON broswer commands and no binary */
      var cmd = JSON.parse(message);
      console.log('Browser | ', cmd);
      /* Pack as MessagePack for use by the robot, and send on the socket */
      var mp_cmd = mp.pack(cmd);
      console.log('Forwarding to '+zmq_send_ch[ws.id]+' '+mp_cmd.length+' bytes.')
      zmq_senders[ws.id].send(mp_cmd);
    });
    
    /* Save this web socket connection */
    ws_clients[ws_id] = ws;
    
    console.log('User is connected to',this.id);
    
  }); // on connection
  console.log('ws',ws_id)
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