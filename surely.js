#!/usr/bin/env node
/*
Next gen version for hosting
*/
var restify = require('restify'),
	server = restify.createServer({
		name: 'surely',
		version: '0.1.0'
	}),
	nodelua = require('nodelua'),
	WebSocketServer = require('ws').Server,
	dgram = require('dgram'),
	zmq = require('zmq'),
	mp = require('msgpack'),
  PeerServer = require('peer').PeerServer,
	fs = require('fs');

/* Is this Needed? Seems so, to get JSON data posted. TODO: See why */
server.use(restify.acceptParser(server.acceptable));
// The query parser *may* have t from the AJAX lib used. May be useful
server.use(restify.queryParser({
	mapParams: true
}));
server.use(restify.bodyParser({
	mapParams: false,
	//maxBodySize: 1024 // Attempt to prevent overflow
}));
// Try this to find the clock skew... may be useful
server.use(restify.dateParser());
// Gzip hurts on super small stuff from hcm
// Should only be used for static cases
//server.use(restify.gzipResponse());

// Load config from Lua
var lua = new nodelua.LuaState('config');
var UPENNDEV_PATH = '../UPennDev';
var Config = lua.doFileSync(UPENNDEV_PATH + '/include.lua');
var streams = Config.net.streams;
console.log(streams);

// Network detection
var NET_OPEN = false;
var ping_skt = zmq.socket('pub');
ping_skt.bind('tcp://*:' + Config.net.ping.tcp);
var go_skt = dgram.createSocket("udp4");
go_skt.bind(Config.net.ping.udp);
go_skt.on("message", function(){
	'use strict';
	if(!NET_OPEN){
		console.log('Network open');
		NET_OPEN = true;
		setTimeout(function(){NET_OPEN=false;console.log('Network closed');}, 1000);
	}
	ping_skt.send('ok');
});

/* Connect to the Arm Plan server - always on localhost :P */
var armplan_skt = zmq.socket('req');
armplan_skt.connect('ipc:///tmp/'+'armplan');
armplan_skt.http_responses = [];
armplan_skt.on('message', function (msg) {
	"use strict";
	var plan = mp.unpack(msg);
	//console.log('plan', plan);
	this.http_responses.shift().json(200, plan);
});
// POST will send FSM events
server.post('/armplan', function(req, res, next){
		"use strict";
	if(req.body === undefined){return next();}
	console.log(req.body);
	// Send to the armplan server
	armplan_skt.send(mp.pack(JSON.parse(req.body))).http_responses.push(res);
	return next();
});

/* Connect to the RPC server */
var rpc = Config.net.rpc;
var rpc_skt = zmq.socket('req');
//var robot_ip = Config.net.robot.wireless;
var robot_ip = Config.net.robot.wired;
rpc_skt.connect('tcp://' + robot_ip + ':' + rpc.tcp_reply);
// For localhost, use this instead:
//rpc_skt.connect('ipc:///tmp/'+rpc.uds);
//console.log(rpc_skt);
rpc_skt.http_responses = [];
// Since a REP/REQ pattern, we can use a queue and know we are OK
// This means one node.js per robot rpc server!
rpc_skt.on('message', function (msg) {
	"use strict";
	this.http_responses.shift().json(200, mp.unpack(msg));
});

/* Standard forwarding pattern to rpc */
function rest_req(req, res, next) {
	"use strict";
	// Ensure we get a val inside the body of a PUT or POST operation
	// Save the parsed body in the params
	if (req.method === 'PUT' || req.method === 'POST') {
		if (req.body !== undefined) {
			req.params.val = JSON.parse(req.body);
			//console.log(typeof req.params.val);
		}
	}
	console.log(req.params);
	// Send to the RPC server
	rpc_skt.send(mp.pack(req.params)).http_responses.push(res);
	return next();
}

// Save data from the app
server.post('/log/:name', function(req, res, next){
	'use strict';
	console.log('Saving a log...');
	var name = 'public/logs/'+req.params.name+'.json';
	//var name = req.params.name+'.json'
	if (req.body !== undefined) {
		fs.writeFile(name, req.body, function (err) {
			if (err) { throw err; }
			res.send();
			console.log('Saved '+name);
		});
	} else {
		res.send();
	}
	return next();
});

// POST will send FSM events
server.post('/fsm/:fsm/:evt', rest_req);

// GET will retrieve SHM values
// PUT will update SHM values
server.get('/shm/:shm/:seg/:key', rest_req);
server.post('/shm/:shm/:seg/:key', rest_req);

// GET will retrieve Body values
// PUT will update Body values
server.get('/body/:body/:comp', rest_req);
server.put('/body/:body/:comp', rest_req);

server.post('/raw/:raw', rest_req);

// Grab streams
server.get('/streams/:stream', function (req, res, next) {
	'use strict';
	var stream = streams[req.params.stream];
	if (typeof stream === 'object' && typeof stream.ws === 'number') {
		res.json(200, stream.ws);
	} else {
		res.send();
	}
	return next();
});

// Grab Config information
function findKey(prev, cur){
	'use strict';
  if (typeof prev !== 'object'){
    prev = Config[prev];
  }
  if (cur !== undefined) {
    return prev[cur];
  }
}
//var cfg_regexp = new RegExp(/^\/([a-zA-Z0-9_\.~-]+)\/(.*)/);
//server.get(cfg_regexp, function(req, res, next) {
//server.get('/config/:key', function (req, res, next) {
//server.get(/\/config\/(.+)/, function (req, res, next) {
server.get(/\/Config\/(.+)/, function (req, res, next) {
	'use strict';
  var value = req.params[0].split('/').reduce(findKey);
	if (value !== undefined) {
    res.json(200, value);
	} else {
		res.send();
	}
	return next();
});

// Serve static items as catch-all
// TODO: text/html?
server.get(/^\/.*/, restify.serveStatic({
  directory: './public',
  "default": 'index.html'
}));

/* WebSocket Handling */
function ws_error(e) {
	"use strict";
	if (e !== undefined) {
		console.log('WS Error:', e);
	}
}

//Send data to the websocket defined in sur_stream
function bridge_send_ws(sur_stream, meta, payload) {
	"use strict";
  var str = JSON.stringify(meta),
		clients = sur_stream.wss.clients,
		i,
		ws;
	for (i = 0; i < clients.length; i = i + 1) {
		ws = clients[i];
		// Send the metadata on the websocket connection
		ws.send(str, ws_error);
		// Follow the metadata with the binary payload (if it exists)
		if (meta.sz > 0) {
			ws.send(payload, {binary: true}, ws_error);
		}
	} // for each client
}

/* UDP Message Handling
 * the payload (e.g. jpeg) is right after the messagepacked metadata (concatenated)
 * msgpack -> JSON
*/
// NOTE: Using udp_wizard right now
/*
function udp_message(msg, rinfo) {
	"use strict";
  //console.log('got udp', rinfo);
  var meta = mp.unpack(msg),
		payload_len = mp.unpack.bytes_remaining,
		payload = msg.slice(msg.length - payload_len); // offset
  // Add the payload sz parameter to the metadata
  meta.sz = 0;
  if (payload !== undefined) {
		meta.sz = payload_len;
	}
	bridge_send_ws(this.sur_stream, meta, payload);
}
*/

/* ZMQ Message Handling
 * msgpack -> JSON
*/
function zmq_message(metadata, payload) {
	"use strict";
  var meta = mp.unpack(metadata);
  //console.log('ZMQ!',meta)
  // Add the payload sz parameter to the metadata
  meta.sz = 0;
  if (payload !== undefined) {meta.sz = payload.length; }
  bridge_send_ws(this.sur_stream, meta, payload);
}

/* WebSocket Server */
function wss_connection(ws) {
	"use strict";
	ws.sur_stream = this.sur_stream;
	//console.log(this.clients);
  /* Web Browser Message */
  ws.on('message', function (msg) {
		console.log('MESSAGE', msg);
	});
  /* On close, remove this client */
  ws.on('close', function () {
		//console.log('CLOSE', this);
	});
}

function wss_error(ws) {
	"use strict";
	console.log('WSS ERROR', ws);
}

/* Bridges for websockets streams */
for (var w in streams) {
	var b = streams[w];
	if (b.ws === undefined) { continue; }
	//console.log('\n'+w+'\n\tWebsocket: '+b.ws);
	var wss = new WebSocketServer({port: b.ws});
	wss.on('connection', wss_connection);
	wss.on('error', wss_error);
	// Save the wsserver reference
	b.wss = wss;
	wss.sur_stream = b;
	// Add UDP listening
	/*
	if (b.udp !== undefined) {
		var udp_recv_skt = dgram.createSocket("udp4");
		udp_recv_skt.bind(b.udp);
		udp_recv_skt.on("message", udp_message);
		udp_recv_skt.sur_stream = b;
	}
	*/
	// Add PUB/SUB
	if (b.sub !== undefined) {
		var zmq_recv_skt = zmq.socket('sub');
		zmq_recv_skt.connect('ipc:///tmp/' + b.sub);
		zmq_recv_skt.subscribe('');
		zmq_recv_skt.on('message', zmq_message);
		zmq_recv_skt.sur_stream = b;
	}
	// Add TCP
	if (b.tcp !== undefined) {
		var zmq_recv_skt = zmq.socket('sub');
		zmq_recv_skt.subscribe('');
		zmq_recv_skt.connect('tcp://'+robot_ip+':'+b.tcp);
		zmq_recv_skt.subscribe('');
		zmq_recv_skt.on('message', zmq_message);
		zmq_recv_skt.sur_stream = b;
	}
}

/* Listen for HTTP on port 8080 */
server.listen(8080, function () {
	"use strict";
	console.log('%s listening at %s to %s', server.name, server.url, robot_ip);
});

/* PeerServer for WebRTC */
var pserver = new PeerServer({ port: 9000 });
pserver.on('connection', function(id) {
	'use strict';
  console.log('Peer connected:', id);
});
pserver.on('disconnect', function(id) {
	'use strict';
  console.log('Peer disconnected:', id);
});
