curl -v -X POST http://localhost:8080/fsm/Body/init
curl -v -X PUT -H "Content-Type:application/json" http://localhost:8080/shm/hcm/tool/yaw -d '{"val":[3]}'
curl -v X GET http://localhost:8080/body/time

