#!/usr/bin/env node

/*
Next gen version for hosting
*/
var restify = require('restify'),
	server = restify.createServer(),
	nodelua = require('nodelua'),
	WebSocketServer = require('ws').Server,
	dgram = require('dgram'),
	zmq = require('zmq'),
	mp = require('msgpack'),
	PeerServer = require('peer').PeerServer;

/* Is this Needed? Seems so, to get JSON data posted. TODO: See why */
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

// Load config from Lua
var lua = new nodelua.LuaState('config');
var Config = lua.doFileSync('UPennDev/include.lua');

/* Connect to the RPC server */
var rpc = Config.net.rpc;
var robot_ip;

if(Config.net.use_wireless){
	robot_ip = Config.net.robot.wireless;
} else {
	robot_ip = Config.net.robot.wired;
}
var rpc_skt = zmq.socket('req');
//rpc_skt.connect('tcp://'+robot_ip+':'+rpc.tcp_reply);
rpc_skt.connect('ipc:///tmp/'+rpc.uds);
rpc_skt.http_responses = [];
// Since a REP/REQ pattern, we can use a queue and know we are OK
// This means one node.js per robot rpc server!
rpc_skt.on('message', function(msg){
	this.http_responses.shift().json(JSON.stringify(mp.unpack(msg)));
});

// Process POST on FSMs
server.post('/fsm/:sm/:event', function (req, res, next) {
	rpc_skt.send(mp.pack({
		fsm: req.params.sm,
		evt: req.params.event,
	})).http_responses.push(res);
	return next();
});

// Process GET on SHM
server.get('/shm/:cm/:segment/:key', function (req, res, next) {
	rpc_skt.send(mp.pack({
		shm : req.params.cm,
		seg : req.params.segment,
		key : req.params.key,
	})).http_responses.push(res);
	return next();
});

// Process PUT on SHM
server.put('/shm/:cm/:segment/:key', function (req, res, next) {
	rpc_skt.send(mp.pack({
		shm : req.params.cm,
		seg : req.params.segment,
		key : req.params.key,
		val : req.params.val,
	})).http_responses.push(res);
	return next();
});

// Process GET on Body
server.get('/body/time', function (req, res, next) {
	rpc_skt.send(mp.pack({
		body: 'get_time',
	})).http_responses.push(res);
	return next();
});
server.get('/body/:part/:component', function (req, res, next) {
	rpc_skt.send(mp.pack({
		body: 'get_' + req.params.part + '_' + req.params.component,
	})).http_responses.push(res);
	return next();
});

// Process Config request
// TODO: Route elements as keys to go deep into the tree?
server.get(/\/config/, function (req, res, next) {
	console.log('Config');
	res.json(Config);
	return next();
});

// Serve static items as catch-all
server.get(/^\/.*/, restify.serveStatic({
  directory: './public',
  default: 'index.html'
}));

/* Listen for HTTP on port 8080 */
server.listen(8080, function () {
	console.log('%s listening at %s', server.name, server.url);
});

/* WebSocket Handling */
function ws_error(e){
	if(e!==undefined){
		console.log('WS Error:', e);
	}
}

/*
 * Send data to the websocket defined in sur_stream
*/
function bridge_send_ws (sur_stream, meta, payload){
  var str = JSON.stringify(meta);
	//console.log(meta, str);
	var clients = sur_stream.wss.clients;
	for(var i=0; i<clients.length; i++ ) {
		var ws = clients[i];
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
function udp_message(msg, rinfo) {
  //console.log('got udp', rinfo);
  var meta = mp.unpack(msg);
  var payload_len = mp.unpack.bytes_remaining;
  var payload = msg.slice(msg.length - payload_len); // offset
  // Add the payload sz parameter to the metadata
  meta.sz = 0;
  if (payload !== undefined) {
		meta.sz = payload_len;
	}
	bridge_send_ws(this.sur_stream, meta, payload);
}

/* ZMQ Message Handling
 * msgpack -> JSON
*/
function zmq_message(metadata, payload) {
  var meta = mp.unpack(metadata);
  //console.log('ZMQ!',meta)
  // Add the payload sz parameter to the metadata
  meta.sz = 0;
  if(payload!==undefined){meta.sz = payload.length;}
  bridge_send_ws(this.sur_stream, meta, payload);
};

/* WebSocket Server */
function wss_connection (ws) {
	ws.sur_stream = this.sur_stream;
	//console.log(this.clients);
  /* Web Browser Message */
  ws.on('message', function(msg){
		console.log('MESSAGE', msg);
	});
  /* On close, remove this client */
  ws.on('close', function(){
		console.log('CLOSE', this);
	});
}

function wss_error (ws) {
	console.log('WSS ERROR', ws);
}

/* Bridges for websockets streams */
var streams = Config.net.streams
for(var w in streams) {
	var b = streams[w];
	if(b.ws === undefined) { continue; }
	console.log('\n'+w+'\n\tWebsocket: '+b.ws);
	var wss = new WebSocketServer({port: b.ws});
	wss.on('connection', wss_connection);
	wss.on('error', wss_error);
	// Save the wsserver reference
	b.wss = wss;
	wss.sur_stream = b;
	// Add UDP listening
	if(b.udp !== undefined){
    console.log('\tUDP Bridge',b.udp);
		var udp_recv_skt = dgram.createSocket("udp4");
		udp_recv_skt.bind(b.udp);
		udp_recv_skt.on("message", udp_message);
		udp_recv_skt.sur_stream = b;
	}
	// Add PUB/SUB
	if(b.sub !== undefined) {
		console.log('\tSubscriber Bridge',b.sub);
		var zmq_recv_skt = zmq.socket('sub');
		zmq_recv_skt.connect('ipc:///tmp/'+b.sub);
		zmq_recv_skt.subscribe('');
		zmq_recv_skt.on('message', zmq_message);
		zmq_recv_skt.sur_stream = b;
	}
}

/* PeerServer for WebRTC */
var pserver = new PeerServer({ port: 9000 });