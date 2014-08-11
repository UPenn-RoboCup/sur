#!/bin/sh
# Server requirements, manage with node and package.json
npm install msgpack ws zmq restify underscore peer nodelua
# Client side JS Dev only
npm install bower gulp gulp-concat main-bower-files gulp-uglify


#curl -v -X POST http://localhost:8080/fsm/Body/init
#curl -v -X PUT -H "Content-Type:application/json" http://localhost:8080/shm/hcm/tool/yaw -d '{"val":[3]}'
#curl -v X GET http://localhost:8080/body/time

