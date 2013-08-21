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

/**
* Load configuration values
* TODO: Make these JSON for both the browser and node
*/
var names     = ['mesh', 'rgbd' ];
var ws_ports  = [9001,   9002   ];
var udp_ports = [5001,   5001   ];
//var rpc_host = '192.168.123.22'
var rpc_host = 'localhost'
var zmq_rpc_addr = 'tcp://'+rpc_host+':5555'

var zmq_req_skt = zmq.socket('req');
var ret = zmq_req_skt.connect(zmq_rpc_addr);
console.log('ZeroMQ RPC | Connected to',zmq_rpc_addr);

var server = restify.createServer({
  name: 'surest',
  version: '0.0.1'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

// Main page
server.get('/', function (req, res, next) {
  var body = fs.readFileSync('commander.html',{encoding:'utf8'});
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/html'
  });
  res.write(body);
  res.end();
} );

// Javascript libraries
server.get('/lib/:library', function (req, res, next) {
  //console.log('library',req.params.library)
  var body = fs.readFileSync('lib/'+req.params.library,{encoding:'utf8'});
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/javascript'
  });
  res.write(body);
  res.end();
});

/* GET: [memory].get_[segment]_[key]()
* vcm.get_head_camera_t()
* */
server.get('/:memory/:segment/:key', function (req, res, next) {
	
  // Send the reply to the host
  var reply_handler = function(data){
    // TODO: Add any timestamp information or anything?
    res.json( mp.unpack(data) )
  }
  zmq_req_skt.once('message', reply_handler);
  
  // Send the RPC over the ZMQ REQ/REP
  // TODO: Deal with concurrent requests?
  // Form the Remote Procedure Call
  req.params.call = 'get'
  zmq_req_skt.send( mp.pack(req.params) );
  
  // TODO: Set a timeout for the REP for HTTP sanity, via LINGER?
	
  return next();
});

/* PUT: [memory].set_[segment]_[key]([val])
* vcm.set_head_camera_t(1120.2)
* Request must have all of the values in []
* */
server.put('/:memory/:segment/:key', function update(req, res, next) {
  // Send the reply to the host
  var reply_handler = function(data){ this.res.send(200); }
  zmq_req_skt.once('message', reply_handler.bind({res:res}));
  req.params.call = 'set';
  req.params.val  = JSON.parse( req.params.val );
  zmq_req_skt.send( mp.pack(req.params) );
  return next();
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});

/***
* Communication with the robot uses ZeroMQ
* Metadata is messagepack'd
* Communication with the web browser uses websockets
*/
var WebSocketServer = require('ws').Server;
var ws_servers    = {}
var ws_clients    = {}
var zmq_receivers = {}
var udp_receivers = {}

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
  console.log('\nBrowser '+names[this.id]+' | ',cmd);
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
  
  console.log('Websocket connection on', names[this.id] );
}

/* Initialize the websocket servers for each port */
for( var w=0; w<ws_ports.length; w++) {
  
  /* Initialize the server */
  var wss = new WebSocketServer({port: ws_ports[w]});
  
  /* Get a connection from a user */
  /* Save which socket this is, using bind */
  wss.on('connection', ws_connection.bind({id: w}) );
  
  ws_servers[w] = wss;
  
  console.log('Websocket ' + names[w] + ' on port ' + ws_ports[w]);
  
} // for loop

/***************
* ZeroMQ robot data receiving
*/
var zmq_message = function(metadata,payload){
  
  var ws = ws_clients[this.id];
  if( ws == undefined ){
    return;
  }
  
  /* msgpack -> JSON */
  var meta = mp.unpack(metadata);
  meta.sz = 0;
  /* Add the payload sz parameter to the metadata */
  if(payload!==undefined){
    meta.sz = payload.length;
  }
  var str = JSON.stringify(meta);
  
  /* Send the metadata on the websocket connection */
  ws.send(str,ws_error);
  
  /* Follow the metadata with the binary payload (if it exists) */
  if(meta.sz>0){
    ws.send(payload,{binary: true},ws_error);
  } // if a payload
  
  //console.log('Robot '+names[this.id]+' | '+str);
}

/***************
* UDP robot data receiving
*/
var udp_message = function(msg,rinfo){
  
  var ws = ws_clients[this.id];
  if( ws == undefined ){
    return;
  }
  
  /* msgpack -> JSON */
  /* the jpeg is right after the messagepacked metadata (concatenated) */
  var meta = mp.unpack(msg)
  var payload = msg.slice(msg.length - tbl.sz) // offset
  
  meta.sz = 0;
  /* Add the payload sz parameter to the metadata */
  if(payload!==undefined){
    meta.sz = payload.length;
  }
  
  var str = JSON.stringify(meta);
  
  /* Send the metadata on the websocket connection */
  ws.send(str,ws_error);
  
  /* Follow the metadata with the binary payload (if it exists) */
  if(meta.sz>0){
    ws.send(payload,{binary: true},ws_error);
  } // if a payload

}

for( var w=0; w<ws_ports.length; w++) {

  /*
  var zmq_recv_skt = zmq.socket('sub');
  zmq_recv_skt.connect('ipc:///tmp/from_'+names[w]);
  zmq_recv_skt.subscribe('');
  console.log('ZeroMQ IPC | Connected to from_'+names[w]);
  zmq_recv_skt.on('message', zmq_message.bind({id:w}) );
  */
  
  var udp_recv = dgram.createSocket("udp4");
  udp_recv.bind(udp_ports[w]);
  udp_recv.on( "message", udp_message.bind({id:w}) );
  udp_receivers[w] = udp_recv

} // for w