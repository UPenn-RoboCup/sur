var zmq = require('zmq');
var mp  = require('msgpack');
var restify = require('restify');

var zmq_req_skt = zmq.socket('req');
zmq_req_skt.connect('ipc:///tmp/test');
console.log('ZeroMQ REQ IPC | Connected!');

var server = restify.createServer({
	name: 'surest',
	version: '0.0.1'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

/* GET: vcm.get_head_camera_t() 
 * [memory].get_[segment]_[key]()
 * */
server.get('/:memory/:segment/:key', function (req, res, next) {
	
	// Send the reply to the host
	// TODO: Deal with timeout issues?
  zmq_req_skt.removeAllListeners('message');
  zmq_req_skt.on('message', function(data){
    payload = mp.unpack(data)
    console.log(payload)
    var str = JSON.stringify(payload);
    this.res.json( str );
  }.bind({"res": res, "req": req}) );
  
	// Send the RPC over the ZMQ REQ/REP
	// TODO: Deal with concurrent requests?
	// Form the Remote Procedure Call
	var lua_rpc = 'return '+req.params.memory
	+'.get_'+req.params.segment
	+'_'+req.params.key
	+'()';
  console.log(lua_rpc);
  var ret = zmq_req_skt.send( lua_rpc );
  
  // TODO: Set a timeout for the REP for HTTP sanity, via LINGER?
	
	return next();
});


/* GET: vcm.dump_head_camera() 
 * [memory].dump_[segment]()
 * */
server.get('/:memory/:segment', function (req, res, next) {
	console.log(req);
	console.log(res);
	res.send(req.params);
	return next();
});


/* GET: vcm.dump() 
 * [memory].dump()
 * */
server.get('/:memory', function (req, res, next) {
	res.send(req.params);
	return next();
});

server.listen(8080, function () {
	console.log('%s listening at %s', server.name, server.url);
});