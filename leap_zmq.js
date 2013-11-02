/***
* SUR: Data forwarding
* (c) Stephen McGill, 2013
*/

/**
* Load configuration values
*/
var ipc_name = 'leap'

/***
* Establish ZMQ connection
*/
var zmq = require('zmq');
var zmq_skt = zmq.socket('pub');
zmq_skt.bind('ipc:///tmp/'+ipc_name);

/***
* Metadata is messagepack'd
*/
var mp = require('msgpack');

/***
* Instantiate to the leap object
*/
var Leap = require('leapjs')
//console.log(Leap)
var controller = new Leap.Controller()

controller.on("frame", function(frame) {
  //console.log("Frame: " + frame.id + " @ " + frame.timestamp);
  //console.log(frame)
  if(frame.hands!==undefined){
    for(var i=0;i<frame.hands.length;i++){
      console.log( frame.hands[i].sphereRadius )
      // Send the frame data over zmq
      var myframe = {};
      myframe.timestamp = frame.timestamp
      myframe.sphereRadius = frame.hands[i].sphereRadius
      zmq_skt.send( mp.pack(myframe) );
    }
  }
  
});

var frameCount = 0;
controller.on("frame", function(frame) {
  frameCount++;
});

setInterval(function() {
  var time = frameCount/2;
  console.log("recieved " + frameCount + " frames @ " + time + "fps");
  frameCount = 0;
}, 2000);

controller.on('ready', function() {
    console.log("ready");
});
controller.on('connect', function() {
    console.log("connect");
});
controller.on('disconnect', function() {
    console.log("disconnect");
});
controller.on('focus', function() {
    console.log("focus");
});
controller.on('blur', function() {
    console.log("blur");
});
controller.on('deviceConnected', function() {
    console.log("deviceConnected");
});
controller.on('deviceDisconnected', function() {
    console.log("deviceDisconnected");
});

controller.connect();
console.log("\nWaiting for device to connect...");