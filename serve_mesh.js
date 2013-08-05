/***
* SUR: Data forwarding
* (c) Stephen McGill, 2013
*/

/**
* Load configuration values
*/
var ipc_name = 'chest_mesh'
var udp_port = 43230
var ws_port = 9002
var zmq_request_ch = 'mesh_requests'

/* NOTE: Everything after this is the same for each port forward */

/**
* Global state variables
*/
var meta;
var raw;
var client_list = [];
var client_next_id = 0;

/***
* Metadata is messagepack'd
*/
var mp = require('msgpack');

/***
* Communication with the robot is on UDP and ZMQ
*/
var zmq = require('zmq');
var dgram = require("dgram");

/***************
* ZeroMQ user request forwarding
*/
var zmq_req_skt = zmq.socket('pub');
zmq_req_skt.bind('ipc:///tmp/'+zmq_request_ch);
console.log('ZeroMQ IPC | Bound to '+zmq_request_ch);

/***************
* WebSocket user request handling
*/
var ws_error = function(e){
	if(e!==undefined){
		console.log('Error:'+e)
	}
}
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: ws_port});
wss.on('connection', function(ws) {
	console.log('A client is Connnected!');
	console.log('Binary Support:'+ws.supports.binary)
  
  // add the user to our running list
  // TODO: Have some list management that is much better :)
  // TODO: Find and splice? I feel that may be kinda expensive, whereas if you just have sets of lists, and trasfer people between lists... w/e
  client_list.push(ws);
  var client_id = client_next_id;
  client_next_id++;
  
	// Client message
	ws.on('message', function(message) {
    
    // check what the message says...
    console.log('Commander | '+message);
    zmq_req_skt.send(message);
    
	});//onmessage
	
	ws.on('close', function(message) {
		console.log('Lost a user!')
    /* Remove the user from the list */
    console.log('Removing '+client_id);
    client_list[client_id] = null;
    //client_list.splice(client_id,1);
	});
	
});

/***************
* UDP data handling
*/
var server = dgram.createSocket("udp4");
server.on("message", function (msg, rinfo) {
	var data = mp.unpack(msg);
	meta = data.meta
	raw = data.raw
	/* Provide Debugging information */
	
	console.log("Robot UDP: " + msg.length + " from " +
	rinfo.address + ":" + rinfo.port);
	
});
server.on("listening", function () {
	var address = server.address();
	console.log("server listening " +
	address.address + ":" + address.port);
});
server.bind(udp_port);

/***************
* ZeroMQ robot data receiving
*/
var zmq_skt = zmq.socket('sub');
zmq_skt.connect('ipc:///tmp/'+ipc_name);
zmq_skt.subscribe('');
console.log('ZeroMQ IPC | Connected to '+ipc_name);
// React to messages
zmq_skt.on('message', function(metadata,payload){
	var upacked_meta = mp.unpack(metadata);
	meta = upacked_meta
  raw = payload
  
  /* Send data to active users */
	for(var i=0;i<client_list.length;i++){
    var ws = client_list[i]
    // check if active
    if(ws!=null){
      meta.sz = raw.length
      ws.send(JSON.stringify(meta),ws_error)
      ws.send(raw,{binary: true},ws_error)
    }
	}
  
	/* Provide Debugging information */

	console.log('Robot ZMQ | ');
	console.log(meta);
	console.log(payload.length);

});
