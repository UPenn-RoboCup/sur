#!/usr/local/bin/node
/***
* SUR: Data forwarding
* (c) Stephen McGill, 2013
*/

var util    = require('util');
var fs      = require('fs');
var zmq     = require('zmq');
var mp      = require('msgpack');
var restify = require('restify');
var dgram   = require("dgram");
var _       = require('underscore');

var homepage="index.html"

/* Remote Procedure Call Configuration */
//var rpc_robot     = '192.168.123.26'
var rpc_robot     = 'localhost'
var rpc_reliable_port   = 55555
var rpc_unreliable_port = 55556

/**
* Load configuration values
* TODO: Make these JSON for both the browser and node
*/
var bridges = [];
bridges.push({
	name : 'mesh', // reliable name
	ws : 9001,
	udp: 33344,
  // reliable request forwards same place
  //req: 33345,
  tcp: 33345,
	clients : []
});

bridges.push({
  name : 'head_camera',
  ws : 9003,
  udp: 33333,
  clients : []
});

bridges.push({
	name : 'rgbd_depth',
	ws : 9004,
	udp: 33346,
	clients : []
});

bridges.push({
  name : 'rgbd_color',
  ws : 9005,
  udp: 33347,
  clients : []
});

bridges.push({
	name : 'spacemouse',
	ws : 9006,
	sub: 'spacemouse',
	clients : []
});

// rest look up table for the objects
var reliable_lookup = {}

/* Begin the REST HTTP server */
var server = restify.createServer({
  name: 'surest',
  version: '0.0.1'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

// HTML files
var load_html = function (req, res, next) {
  var body = fs.readFileSync(homepage,{encoding:'utf8'});
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/html'
  });
  res.write(body);
  res.end();
};
server.get('/', load_html );

// Javascript libraries
var load_js = function (req, res, next) {
  //console.log('library',req.params.js)
  var body = fs.readFileSync(this.base_dir+'/'+req.params.js,{encoding:'utf8'});
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/javascript'
  });
  res.write(body);
  res.end();
};
server.get('/lib/:js', load_js.bind({base_dir: 'lib'}) );
server.get('/js/:js', load_js.bind({base_dir: 'js'}) );

// Images
var load_img = function(req, res, next) {
  //console.log('img',req.params,fname);
  var raw = fs.readFile(this.base_dir+'/'+req.params.img, function(err, file) {
    if (err) {
      console.log(err,file);
      res.writeHead(500);
      return res.end();
    }
    res.writeHead(200);
    res.write(file);
    res.end();
    return next();
  });
};
server.get('/png/:img', load_img.bind({base_dir: 'png'}) );
server.get('/jpg/:img', load_img.bind({base_dir: 'jpg'}) );
// stl loader ignores content type, so we are ok :)
server.get('/stl/:img', load_img.bind({base_dir: 'stl'}) );
server.get('/vrml/:img', load_img.bind({base_dir: 'vrml'}) );

// CSS stylesheet
var load_css = function (req, res, next) {
  //console.log('library',req.params.library)
  var body = fs.readFileSync(this.base_dir+'/'+req.params.css,{encoding:'utf8'});
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/css'
  });
  res.write(body);
  res.end();
};
server.get('/css/:css', load_css.bind({base_dir: 'css'}) );

/* Shared memory management: [memory].get_[segment]_[key]()
* vcm.set_head_camera_t(val)
* */
var rest_shm = function (req, res, next) {

// debug rest requests for shm
console.log(req.params);

  // Send the reply to the host
  var reply_handler = function(data){
    // TODO: Add any timestamp information or anything?
    var ret = mp.unpack(data)
    console.log(ret)
    if(ret!=null){
      res.json( ret )
    } else {
      res.send()
    }
  }
  zmq_req_skt.once('message', reply_handler);
  
  // Send the RPC over the ZMQ REQ/REP
  // TODO: Deal with concurrent requests?
  // Form the Remote Procedure Call
  if(req.params.val!==undefined){
    req.params.val = JSON.parse( req.params.val );
  }
  zmq_req_skt.send( mp.pack(req.params) );
  
  // TODO: Set a timeout for the REP for HTTP sanity, via LINGER?
  
  return next();
}

/* FSM event sending and state getting
* sm:add_event('standup')
* */
var rest_fsm = function (req, res, next) {
  
  // debug rest requests for fsm
  //console.log(req.params);
  
  // Send the reply to the host
  var reply_handler = function(data){
    // TODO: Add any timestamp information or anything?
    var ret = mp.unpack(data);
    if(ret!=null){
      res.json( ret );
    } else {
      res.send();
    }
  }
  zmq_req_skt.once('message', reply_handler);
  
  // Send the RPC over the ZMQ REQ/REP
  // TODO: Deal with concurrent requests?
  // Form the Remote Procedure Call
  zmq_req_skt.send( mp.pack(req.params) );
  
  // TODO: Set a timeout for the REP for HTTP sanity, via LINGER?
  return next();
}

/* Reliable large data
* reliable_mesh:send('')
* */
var rest_reliable = function (req, res, next) {
  
  // debug rest requests for fsm
  console.log('reliable',req.params);

  // grab the bridge
  var my_bridge = reliable_lookup[req.params.reliable];
  //console.log(my_bridge)
  
  // Send the reply to the host
  var reply_handler = function(metadata,payload){
    // TODO: Add any timestamp information or anything?
    var meta = mp.unpack(metadata);
    // TODO: Not sure if safe to use my_bridge
    bridge_send_ws(my_bridge,meta,payload);
    res.send();
  }
  zmq_req_skt.once('message', reply_handler);
  
  // Send over the ZMQ REQ/REP
  my_bridge.requester.send( mp.pack(req.params) );
  
  // TODO: Set a timeout for the REP for HTTP sanity, via LINGER?
  return next();
}

/***
* Communication with the robot uses ZeroMQ
* Metadata is messagepack'd
* Communication with the web browser uses websockets
*/
var WebSocketServer = require('ws').Server;

/***************
* WebSocket handlers
*/
var ws_error = function(e){
	if(e!==undefined){ console.log('Error:',e); }
}

var ws_message = function(msg){
  /* Accept JSON browser commands and no binary */
  var cmd = JSON.parse(msg);
  console.log('\nBrowser '+bridges[this.id]+' | ',cmd);
}

var ws_close = function(e){
  //console.log('Closed',this.n, this.id);
  bridges[this.id].clients[this.n] = false;
  bridges[this.id].clients = _.compact(bridges[this.id].clients);
}

var ws_connection = function(ws){
  /* Web Browser Message */
  ws.on('message', ws_message.bind({id: this.id}) );
  /* Save this web socket connection */
  var conn_number = bridges[this.id].clients.length;
  bridges[this.id].clients.push(ws);
  /* On close, remove this client */
  ws.on('close', ws_close.bind(  {id: this.id, n: conn_number}) );
}

var bridge_send_ws = function(b_id,meta,payload){
	var b_c = bridges[b_id].clients;
  var str = JSON.stringify(meta);
	for( var i=0; i<b_c.length; i++ ) {
		var ws = b_c[i];
		/* Send the metadata on the websocket connection */
		ws.send(str,ws_error);
		/* Follow the metadata with the binary payload (if it exists) */
		if(meta.sz>0){
			ws.send(payload,{binary: true},ws_error);
		}
	} // for each client
}

/***************
* ZeroMQ receiving
*/
var zmq_message = function(metadata,payload){
  //console.log('zmq message!!')
  /* msgpack -> JSON */
  var meta = mp.unpack(metadata);
  //console.log(meta)
  /* Add the payload sz parameter to the metadata */
  meta.sz = 0;
  if(payload!==undefined){meta.sz = payload.length;}
  bridge_send_ws(this.id,meta,payload);
};

/***************
* UDP robot data receiving
*/
var udp_message = function(msg,rinfo){
  //console.log('got im')
  /* msgpack -> JSON */
  /* the jpeg is right after the messagepacked metadata (concatenated) */
  var meta = mp.unpack(msg)
  var payload_len = mp.unpack.bytes_remaining
  var payload = msg.slice(msg.length - payload_len) // offset
  /* Add the payload sz parameter to the metadata */
  meta.sz = 0;
  if(payload!==undefined){meta.sz = payload_len;}
	bridge_send_ws(this.id,meta,payload);

}

/* Bridge to  websockets */
for( var w=0; w<bridges.length; w++) {

	var b = bridges[w];
  
	if( b.ws !== undefined ) {

		var wss = new WebSocketServer({port: b.ws});
		wss.on('connection', ws_connection.bind({id: w}) );
		console.log('\n'+b.name);
    console.log('\tWebsocket: '+b.ws)

		if( b.sub !== undefined ) {
			var zmq_recv_skt = zmq.socket('sub');
			zmq_recv_skt.connect('ipc:///tmp/'+b.ipc);
			zmq_recv_skt.subscribe('');
			zmq_recv_skt.on('message', zmq_message.bind({id:w}) );
			console.log('\tSubscriber Bridge',b.sub);
		}

		if( b.udp !== undefined ){
			var udp_recv_skt = dgram.createSocket("udp4");
			udp_recv_skt.bind( b.udp );
			udp_recv_skt.on( "message", udp_message.bind({id:w}) );
			console.log('\tUDP Bridge',b.udp);
		}

    if( b.req !== undefined ) {
      var zmq_req_skt = zmq.socket('req');
      zmq_req_skt.connect('tcp://'+rpc_robot+':'+b.req);
      zmq_req_skt.on('message', zmq_message.bind({id:w}) );
      console.log('\tRequester Bridge',b.req);
      b.requester = zmq_req_skt;
      reliable_lookup[b.name]=b;
    }

    if( b.tcp !== undefined ) {
      var zmq_tcp_skt = zmq.socket('sub');
      zmq_tcp_skt.connect('tcp://'+rpc_robot+':'+b.tcp);
      zmq_tcp_skt.subscribe('');
      zmq_tcp_skt.on('message', zmq_message.bind({id:w}) );
      console.log('\tTCP Sub Bridge',b.tcp);
    }

	} //ws check

} // for w

/* Setup the REST routes */
// shared memory
server.get('/m/:shm/:segment/:key', rest_shm);
server.post('/m/:shm/:segment/:key',rest_shm);
// state machines
//server.get('/s/:fsm', rest_fsm);
//server.post('/s/:fsm',rest_fsm);
server.post('/s',rest_fsm);
// Reliable large data
server.post('/r/:reliable',rest_reliable);

/* Connect to the RPC server */
var zmq_req_skt = zmq.socket('req');
var ret = zmq_req_skt.connect('tcp://'+rpc_robot+':'+rpc_reliable_port);
console.log('\nRESTful reliable RPC connected to ',rpc_robot,rpc_reliable_port);

/*
var udp_rpc_skt = dgram.createSocket("udp4");
var ret = udp_rpc_skt.connect(rpc_unreliable_port);
console.log('\nRESTful unreliable RPC connected to ', rpc_robot, rpc_unreliable_port);
*/

/* Listen for HTTP on port 8080 */
server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});
