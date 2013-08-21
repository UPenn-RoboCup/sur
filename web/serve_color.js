/***
* SUR: Data forwarding
* (c) Stephen McGill, 2013
*/

/**
* Load configuration values
*/
var ipc_name = 'rgbd_color'
var udp_port = 43231
var ws_port = 9001

/* NOTE: Everything after this is the same for each port forward */

/**
* Global state variables
*/
var meta;
var raw;

/***
* Metadata is messagepack'd
*/
var mp = require('msgpack');

/***************
* UDP data handling
*/
var dgram = require("dgram");
var server = dgram.createSocket("udp4");
server.on("message", function (msg, rinfo) {
	//var data = mp.unpack(msg);
	//meta = data.meta
	//raw = data.raw
	/* Provide Debugging information */
	/*
	console.log("server got: " + msg.length + " from " +
	rinfo.address + ":" + rinfo.port);
	*/
});
server.on("listening", function () {
	var address = server.address();
	console.log("server listening " +
	address.address + ":" + address.port);
});
server.bind(udp_port);

/***************
* ZeroMQ data handling
*/
var zmq = require('zmq');
var zmq_skt = zmq.socket('sub');
zmq_skt.connect('ipc:///tmp/'+ipc_name);
zmq_skt.subscribe('');
console.log('ZeroMQ IPC | Connected to '+ipc_name);
// React to messages
zmq_skt.on('message', function(metadata,payload){
	var upacked_meta = mp.unpack(metadata);
	meta = upacked_meta
	raw = payload
	/* Provide Debugging information */
	/*
	console.log('Robot | ');
	console.log(meta);
	console.log(payload.length);
	*/
});

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
	// Client message
	ws.on('message', function(message) {
		if(raw!==undefined){
			meta.sz = raw.length
			ws.send(JSON.stringify(meta),ws_error)
			ws.send(raw,{binary: true},ws_error)
		} else {
			console.log('Commander | ');
			console.log(message);	
		}
	});//onmessage
	
	ws.on('close', function(message) {
		console.log('Lost a user!')
	});
	
});
