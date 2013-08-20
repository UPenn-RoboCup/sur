var util = require('util')
var zmq = require('zmq');
var mp  = require('msgpack');
var restify = require('restify');

var zmq_req_skt = zmq.socket('req');
// 100 ms timeout
//zmq_req_skt.setsockopt(zmq.ZMQ_LINGER, 100)
zmq_req_skt.connect('ipc:///tmp/test');
console.log('ZeroMQ REQ IPC | Connected!');

var server = restify.createServer({
  name: 'surest',
  version: '0.0.1'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

/* GET: [memory].get_[segment]_[key]()
* vcm.get_head_camera_t()
* */
server.get('/:memory/:segment/:key', function (req, res, next) {
	
  // Send the reply to the host
  var reply_handler = function(data){
    res.json( JSON.stringify(mp.unpack(data)) );
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
  var reply_handler = function(data){
    res.send(200);
  }
  zmq_req_skt.once('message', reply_handler);
  req.params.call = 'set'
  req.params.val  = JSON.parse(req.params.val);
  zmq_req_skt.send( mp.pack(req.params) );
  return next();
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});