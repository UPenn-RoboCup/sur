var util = require('util');
var fs = require('fs');
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
    //var value = {val: mp.unpack(data)};
    //console.log(value);
    //res.send(JSON.stringify(value));
    res.json( {val: mp.unpack(data)} );
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
server.post('/:memory/:segment/:key', function update(req, res, next) {
  
  // Send the reply to the host
  var reply_handler = function(data){
    this.res.send(200);
  }
  zmq_req_skt.once('message', reply_handler.bind({res:res}));
  req.params.call = 'set'
  zmq_req_skt.send( mp.pack(req.params) );
  return next();
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});