var restify = require('restify');

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
	// Form the Remote Procedure Call
	var lua_rpc = req.params.memory
	+'.get_'+req.params.segment
	+'_'+req.params.key
	+'()'
	console.log(lua_rpc)
	
	// Send the RPC over the ZMQ REQ/REP
	// TODO: Deal with concurrent requests?
	
	
	// Send the reply to the host
	// TODO: Deal with timeout issues?
	res.send(req.params);
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
