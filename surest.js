#!/usr/bin/env node
/***
* SUR: Data forwarding
* (c) Stephen McGill, 2013
*/

// TODO: Add a logging bridge

var util    = require('util');
var fs      = require('fs');
var zmq     = require('zmq');
var mp      = require('msgpack');
var restify = require('restify');
var dgram   = require('dgram');
var _       = require('underscore');

/* Remote Procedure Call Configuration */
//var rpc_robot     = '192.168.123.26'; // teddy
//var rpc_robot     = '192.168.123.24'; //alvin
//var rpc_robot     = '192.168.123.27'; // simon
//var rpc_robot = '20.20.20.6'; // YouBot
//var rpc_robot = '25.25.1.112';
var rpc_robot     = 'localhost'
var rpc_reliable_port   = 55555;
var rpc_unreliable_port = 55556;
var homepage = 'meshy';

/**
* Load configuration values
* TODO: Make these JSON for both the browser and node
*/
var bridges = [];
bridges.push({
	name : 'mesh', // reliable name
	ws : 9001,
	udp: 33344,
  //tcp: 33345,
	clients : []
});

bridges.push({
  name : 'camera0',
  ws : 9003,
  udp: 33333,
  //tcp : 33334,
	sub : 'camera0',
  clients : []
});

bridges.push({
  name : 'forehead_camera',
  ws : 9004,
  udp: 33335,
  //tcp: 33336,
  clients : []
});

bridges.push({
	name : 'feedback',
	ws : 9013,
	udp: 54329,
	clients : []
});

bridges.push({
	name : 'audio',
	ws : 9014,
  //tcp: 55557,
	clients : []
});

bridges.push({
	name : 'lidar0',
	ws : 9015,
	sub: 'lidar0',
	clients : []
});

bridges.push({
	name : 'touch',
	ws : 9064,
	pub: 'touch',
	sub: 'bbox', // listen for the bounding box
	/*tcp: '55588',*/
	clients : []
});

bridges.push({
	name : 'wire',
	ws : 9065,
	sub: 'wire',
	tcp: '55589',
	clients : []
});

/*
bridges.push({
	name : 'rgbd_depth',
	ws : 9010,
	udp: 33346,
	clients : []
});

bridges.push({
  name : 'rgbd_color',
  ws : 9011,
  udp: 33347,
  clients : []
});

bridges.push({
	name : 'spacemouse',
	ws : 9012,
	sub: 'spacemouse',
	clients : []
});
*/

// rest look up table for the objects
var reliable_lookup = {}

/* Begin the REST HTTP server */
var server = restify.createServer({
  name: 'surest',
  version: '1.0.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

// HTML files
var load_html = function (req, res, next) {
  // Select a page
  var page;
  if(req.params.html !== undefined) {
    page = 'views/'+req.params.html+'.html';
  } else if(req.params.long !== undefined) {
		page = 'views/'+req.params.long;
	} else {
    page = 'views/'+homepage+'.html';
  }
  // Perform the load
  var body = fs.readFileSync(page,{encoding:'utf8'});
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/html'
  });
  res.write(body);
  res.end();
};
server.get('/', load_html );
// Other html views
server.get('/v/:html', load_html );
server.get('/views/:long', load_html );

// Text files
var load_txt = function (req, res, next) {
  // Select a page
  var page;
  if(req.params.md!==undefined){
    page = 'md/'+req.params.md+'.md';
  }
  // Perform the load
  var body = fs.readFileSync(page,{encoding:'utf8'});
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/plain'
  });
  res.write(body);
  res.end();
};
server.get('/md/:md', load_txt );

// Javascript libraries
var load_js = function (req, res, next) {
	var mrdir;
	var myfile = req.params.js;
	//console.log('library',req.params);
	if (myfile===undefined){
		mydir = req.params[0];
		myfile = req.params[1]+'.js';
	} else {
		mydir = this.base_dir;
	}
	//console.log('parsed_libs',mydir,myfile);
	var fname = mydir+'/'+myfile;
  var body = fs.readFileSync(fname,{encoding:'utf8'});
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/javascript'
  });
  res.write(body);
  res.end();
};
server.get('/snap/:js', load_js.bind({base_dir: 'snap'}));
server.get(/^\/([a-zA-Z0-9_\.~-]+)\/(.*)\.js/, load_js);

// Images
var load_img = function(req, res, next) {
  //console.log('img',req.params,fname);
  var raw = fs.readFile(this.base_dir+'/'+req.params.img, function(err, file) {
    if (err) {
      console.log('Image error',err,file);
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
server.get('/figures/:img', load_img.bind({base_dir: 'figures'}) );
server.get('/lib/MathJax/images/:img', load_img.bind({base_dir: 'lib/MathJax/images'}) );
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

var rest_audio = function(req, res, next){
  fs.readFile( __dirname + '/robot.mp3', function (err, data) {
    if (err) {throw err;}
    console.log(data.length)
    res.writeHead(200, {
      'Content-Length': data.length,
      'Content-Type': 'arraybuffer'
    });

    res.write(data);
    res.end();
    console.log('audio done!');
  });
}

/* Shared memory management: [memory].get_[segment]_[key]()
* vcm.set_head_camera_t(val)
* */
var rest_shm = function (req, res, next) {

  // debug rest requests for shm
  //console.log(req.params);
  var msg = {}

  // Send the reply to the host
  var reply_handler = function(data){
    // TODO: Add any timestamp information or anything?
    var ret = mp.unpack(data)

    console.log(msg,ret);

    if(ret!=null){
      res.json( ret );
    } else {
      res.send()
    }
    // Stop this emitter listener
    //zmq_req_rest_skt.removeListener('message', this.cb);
  }
  //zmq_req_rest_skt.once('message', reply_handler.bind({cb:reply_handler}));
  zmq_req_rest_skt.once('message', reply_handler);

  // Send the RPC over the ZMQ REQ/REP
  // TODO: Deal with concurrent requests?
  // Form the Remote Procedure Call
  msg.shm = req.params.shm

  if(req.params.val!==undefined){
    msg.val = JSON.parse( req.params.val );
    msg.access = 'set_'+req.params.segment+'_'+req.params.key;
  } else if(req.params.delta!==undefined){
    msg.val = JSON.parse( req.params.delta );
    msg.access = 'delta_'+req.params.segment+'_'+req.params.key;
  } else {
    msg.access = 'get_'+req.params.segment+'_'+req.params.key;
  }

  console.log(msg);
  zmq_req_rest_skt.send( mp.pack(msg) );

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
    // Stop this emitter listener
    //zmq_req_rest_skt.removeListener('message', this.cb);
  }

  if(req.params.val!==undefined){
    req.params.val = JSON.parse( req.params.val );
  }
  /*
  if(req.params.delta!==undefined){
    req.params.delta = JSON.parse( req.params.delta );
  }
  */

  //zmq_req_rest_skt.once('message', reply_handler.bind({cb:reply_handler}));
  zmq_req_rest_skt.once('message', reply_handler);

  // Send the RPC over the ZMQ REQ/REP
  // TODO: Deal with concurrent requests?
  // Form the Remote Procedure Call
  zmq_req_rest_skt.send( mp.pack(req.params) );

  // TODO: Set a timeout for the REP for HTTP sanity, via LINGER?
  return next();
}

/* Shared memory management: [memory].get_[segment]_[key]()
* vcm.set_head_camera_t(val)
* */
var rest_body = function (req, res, next) {

  // debug rest requests for shm
  console.log(req.params);

  // Send the reply to the host
  var reply_handler = function(data){
    // TODO: Add any timestamp information or anything?
    var ret = mp.unpack(data)

    if(ret!=null){
      res.json( ret );
    } else {
      res.send()
    }
    // Stop this emitter listener
    //zmq_req_rest_skt.removeListener('message', this.cb);
  }
  //zmq_req_rest_skt.once('message', reply_handler.bind({cb:reply_handler}));
  zmq_req_rest_skt.once('message', reply_handler);

  // Send the RPC over the ZMQ REQ/REP
  // TODO: Deal with concurrent requests?
  // Form the Remote Procedure Call
  if(req.params.bargs!==undefined){
    req.params.bargs = JSON.parse( req.params.bargs );
  }
  zmq_req_rest_skt.send( mp.pack(req.params) );

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
  /* Accept JSON browser data */
  var data = JSON.parse(msg);
	var b = bridges[this.id];
  //console.log('\nBrowser '+b+' | ',data);
	b.zmq_pub.send(mp.pack(data));
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
  //console.log('ZMQ!',meta)
  /* Add the payload sz parameter to the metadata */
  meta.sz = 0;
  if(payload!==undefined){meta.sz = payload.length;}
  bridge_send_ws(this.id,meta,payload);
};

/**
* UDP robot data receiving
*/
var udp_message = function(msg,rinfo){
  //console.log('got udp',rinfo);
  /* msgpack -> JSON */
  /* the jpeg is right after the messagepacked metadata (concatenated) */
  var meta = mp.unpack(msg);
  var payload_len = mp.unpack.bytes_remaining;
  var payload = msg.slice(msg.length - payload_len); // offset
  /* Add the payload sz parameter to the metadata */
  meta.sz = 0;
  if(payload!==undefined){meta.sz = payload_len;}
  //console.log('sending...', this.id);
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
			zmq_recv_skt.connect('ipc:///tmp/'+b.sub);
			zmq_recv_skt.subscribe('');
			zmq_recv_skt.on('message', zmq_message.bind({id:w}) );
			console.log('\tSubscriber Bridge',b.sub);
		}

		if( b.udp !== undefined ){
      console.log('\tUDP Bridge',b.udp);
			var udp_recv_skt = dgram.createSocket("udp4");
			udp_recv_skt.bind( b.udp );
			udp_recv_skt.on( "message", udp_message.bind({id:w}) );
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
			zmq_tcp_skt.subscribe('');
      //zmq_tcp_skt.connect('tcp://'+rpc_robot+':'+b.tcp);
			zmq_tcp_skt.bind('tcp://*:'+b.tcp);
      zmq_tcp_skt.on('message', zmq_message.bind({id:w}) );
      console.log('\tTCP Sub Bridge',b.tcp);
    }

		if( b.pub !== undefined ) {
			var zmq_send_skt = zmq.socket('pub');
			zmq_send_skt.bind('ipc:///tmp/'+b.pub);
			console.log('\tPublisher Bridge',b.pub);
			b.zmq_pub = zmq_send_skt;
		}

	} //ws check

} // for w

/* Setup the REST routes */
// shared memory
server.get('/m/:shm/:segment/:key',  rest_shm);
server.post('/m/:shm/:segment/:key', rest_shm);
// state machines
//server.get('/s/:fsm', rest_fsm);
//server.post('/s/:fsm',rest_fsm);
server.post('/s',rest_fsm);
//
server.post('/b',rest_body);
server.get('/b',rest_body);
//
server.get('/a',rest_audio);

/* Connect to the RPC server */
var zmq_req_rest_skt = zmq.socket('req');
var ret = zmq_req_rest_skt.connect('tcp://'+rpc_robot+':'+rpc_reliable_port);
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

var PeerServer = require('peer').PeerServer;
var pserver = new PeerServer({ port: 9000 });
