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

/* GET: vcm.get_head_camera_t() 
* [memory].get_[segment]_[key]()
* */
server.get('/:memory/:segment/:key', function (req, res, next) {
	
  // Send the reply to the host
  // TODO: Deal with timeout issues?
  var reply_handler = function(data){
    try {
      payload = mp.unpack(data)
      console.log(payload)
      var str = JSON.stringify(payload);
      res.json( str );
      console.log(this)
    } catch(e) {
      console.log("zmq request reply error " + e);
    }
  }
  zmq_req_skt.once('message', reply_handler);
  
  // Send the RPC over the ZMQ REQ/REP
  // TODO: Deal with concurrent requests?
  // Form the Remote Procedure Call
  req.params.call = 'get'
  var ret = zmq_req_skt.send( mp.pack(req.params) );
  
  // TODO: Set a timeout for the REP for HTTP sanity, via LINGER?
	
  return next();
});

/* PUT: vcm.get_head_camera_t() 
* [memory].set_[segment]_[key]()
* */
server.put('/:memory/:segment/:key', function update(req, res, next) {
	
  console.log(req.params)
  
  // Send the reply to the host
  // TODO: Deal with timeout issues?
  var reply_handler = function(data){
    try {
      payload = mp.unpack(data)
      console.log('Payload',payload)
      var str = JSON.stringify(payload);
      res.json( str );
    } catch(e) {
      console.log("zmq request reply error " + e);
    }
  }
  zmq_req_skt.once('message', reply_handler);
  req.params.call = 'set'
  req.params.val = JSON.parse(req.params.val);
  var ret = zmq_req_skt.send( mp.pack(req.params) );
  
  // TODO: Set a timeout for the REP for HTTP sanity, via LINGER?
	
  return next();
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});