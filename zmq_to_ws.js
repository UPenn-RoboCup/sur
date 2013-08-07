/***
* SUR: Data forwarding
* (c) Stephen McGill, 2013
*/

/**
* Load configuration values
*/
var names    = ['operator', 'mesh', 'rgbd' ];
var ws_ports = [9001,       9002,   9003   ];

/***
* Communication with the robot uses ZeroMQ
* Metadata is messagepack'd
* Communication with the web browser uses websockets
*/
var zmq = require('zmq');
var mp  = require('msgpack');
var WebSocketServer = require('ws').Server;

var ws_servers  = {}
var ws_clients  = {}

/* Only allow one client (the latest one) */
var zmq_receivers = {}
var zmq_senders   = {}

/**
* Global state variables
*/

/***************
* WebSocket handlers
*/
var ws_error = function(e){
	if(e!==undefined){ console.log('Error:',e); }
}

var ws_message = function(msg){
  /* Accept JSON browser commands and no binary */
  var cmd = JSON.parse(msg);
  console.log('\nBrowser '+names[this.id]+' | '+cmd);
  /* Pack as MessagePack for use by the robot, and send on the socket */
  var mp_cmd = mp.pack(cmd);
  console.log('Forwarding to '+names[this.id]+' '+mp_cmd.length+' bytes.')
  zmq_senders[this.id].send(mp_cmd);
}

var ws_connection = function(ws){
  /* Web Browser Message */
  /* TODO: Each server, for now, only has one client */
  ws.on('message', ws_message.bind({id: this.id}) );
  
  /* Save this web socket connection */
  ws_clients[this.id] = ws;
  
  console.log('User is connected to',this.id);
}

/* Initialize the websocket servers for each port */
for( var w=0; w<ws_ports.length; w++) {
  
  /* Initialize the server */
  var wss = new WebSocketServer({port: ws_ports[w]});
  
  /* Get a connection from a user */
  /* Save which socket this is, using bind */
  wss.on('connection', ws_connection.bind({id: w}) );
  
  ws_servers[w] = wss;
  
  console.log('Initialized ' + names[w] + ' on port ' + ws_ports[w]);
  
} // for loop

/***************
* ZeroMQ robot data receiving
*/

var zmq_message = function(metadata,payload){
  var meta = mp.unpack(metadata);
  /* Add the payload sz parameter to the metadata */
  if(payload!==undefined){
    meta.sz = payload.length;
  } else {
    meta.sz = 0;
  } // if a payload

  /* Provide Debugging information */
  var ws = ws_clients[this.id];
  if( ws != null ){
    /* Browser expects JSON metadata, sent as a string */
    var str = JSON.stringify(meta);
    ws.send(str,ws_error);
    /* Follow the metadata with the binary payload (if it exists) */
    if(meta.sz>0){
      ws.send(payload,{binary: true},ws_error);
    } // if a payload
    console.log('Robot '+names[this.id]+' | '+str);
  } // if not null
}

for( var w=0; w<ws_ports.length; w++) {
  
  var zmq_send_skt = zmq.socket('pub');
  zmq_send_skt.bind('ipc:///tmp/to_'+names[w]);
  console.log('ZeroMQ IPC | Bound to to_'+names[w]);
  zmq_senders[w] = zmq_send_skt

  var zmq_recv_skt = zmq.socket('sub');
  zmq_recv_skt.connect('ipc:///tmp/from_'+names[w]);
  zmq_recv_skt.subscribe('');
  console.log('ZeroMQ IPC | Connected to from_'+names[w]);
  zmq_recv_skt.on('message', zmq_message.bind({id:w}) );

} // for w