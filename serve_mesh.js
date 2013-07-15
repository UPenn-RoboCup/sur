/***
* SUR: Data forwarding
* (c) Stephen McGill, 2013
*/

/***
* Metadata is messagepack'd
*/
var mp = require('msgpack');

/**
* Load configuration values
*/
var ipc_name = 'rgbd_depth'
var udp_port = 43230

/**
* Global state variables
*/
var meta_depth;
var raw_depth;
var meta_color;
var raw_color;

/***************
* UDP data handling
*/
var dgram = require("dgram");
var server = dgram.createSocket("udp4");
server.on("message", function (msg, rinfo) {
	//var data = mp.unpack(msg);
	//meta_depth = data.meta
	//raw_depth = new Buffer(data.raw)
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
	var meta = mp.unpack(metadata);
	meta_depth = meta
	raw_depth = new Buffer(payload)
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
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: 9002});
wss.on('connection', function(ws) {
	console.log('A client is Connnected!');
	console.log('Binary Support:'+ws.supports.binary)
	// Client message
	ws.on('message', function(message) {
		if(raw_depth!==undefined){
			console.log( 'sending '+raw_depth.length+" bytes." )
			ws.send(raw_depth,{binary: true},function(error) {
				if(error!==undefined){
					console.log('Error:'+error)
				}
			})
		} else {
			ws.send('hi from node')
		}
		console.log('Commander | ');
		console.log(message);
	});
});

