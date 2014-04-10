#!/bin/sh
# Node.js from apt-get is too old. First do:
# sudo add-apt-repository ppa:chris-lea/node.js
# sudo apt-get update
# sudo apt-get install nodejs
# Check if /usr/local/bin/node exists, if not:
# sudo ln -s /usr/bin/node /use/local/bin/node
npm install msgpack ws zmq restify underscore peer
