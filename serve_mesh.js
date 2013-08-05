/***
* SUR: Data forwarding
* (c) Stephen McGill, 2013
*/

/**
* Load configuration values
*/
var zmq_response_sh = 'mesh_response'
var zmq_request_ch  = 'mesh_request'
var ws_port         = 9002
var udp_port        = 43288
var udp_addr        =  '192.168.123.22'

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
var zmq   = require('zmq');
var dgram = require("dgram");

/***************
* ZeroMQ user request forwarding
*/
var zmq_req_skt = zmq.socket('pub');
zmq_req_skt.bind('ipc:///tmp/'+zmq_request_ch);
console.log('ZeroMQ IPC | Bound to '+zmq_request_ch);

/***************
* UDP user request forwarding
*/
var udp_req_skt = dgram.createSocket("udp4");

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
    var msg = JSON.parse(message);
    // check what the message says...
    console.log('Commander | ',msg);
    var mp_msg = mp.pack(msg)
    zmq_req_skt.send(mp_msg);
    udp_req_skt.send( mp_msg, 0 , mp_msg.length, udp_port, udp_addr );
    
	});//onmessage
	
	ws.on('close', function(message) {
		console.log('Lost a user!')
    /* Remove the user from the list */
    console.log('Removing '+client_id);
    client_list[client_id] = null;
	});
	
});

/***************
* UDP robot data receiving
*/
var server = dgram.createSocket("udp4");
server.bind(udp_port);
server.on("message", function (msg, rinfo) {
  var tbl = mp.unpack(msg)
  // the jpeg is right after the messagepacked metadata (concatenated)
  var raw_offset = msg.length - tbl.sz
  raw = msg.slice(raw_offset)
  var str = JSON.stringify(tbl)
  
  /* Send data to active users */
	for(var i=0;i<client_list.length;i++){
    var ws = client_list[i]
    // check if active
    if(ws!=null){
      ws.send(str,ws_error)
      ws.send(raw,{binary: true},ws_error)
    }
	}
  
	/* Provide Debugging information */
	
	console.log("Robot UDP: " + msg.length + " from " +
	rinfo.address + ":" + rinfo.port);
	
});
server.on("listening", function () {
	var address = server.address();
	console.log("server listening " +
	address.address + ":" + address.port);
});

/***************
* ZeroMQ robot data receiving
*/
var zmq_skt = zmq.socket('sub');
zmq_skt.connect('ipc:///tmp/'+zmq_response_sh);
zmq_skt.subscribe('');
console.log('ZeroMQ IPC | Connected to '+zmq_response_sh);
// React to messages
zmq_skt.on('message', function(metadata,payload){
  raw = payload
	var upacked_meta = mp.unpack(metadata);
	meta = upacked_meta
  meta.sz = raw.length

	/* Provide Debugging information */
	console.log('Robot ZMQ | ',meta);
	console.log(raw.length);
  
  /* Send data to active users */
	for(var i=0;i<client_list.length;i++){
    var ws = client_list[i]
    // check if active
    if(ws!=null){
      var str = JSON.stringify(meta)
      console.log(str)
      ws.send(str,ws_error)
      ws.send(raw,{binary: true},ws_error)
    }
	}

});
