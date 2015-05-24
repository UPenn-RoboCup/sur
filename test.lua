print('hi')
--[[
var luavm = require('./lua.vm.js');
var str = require("fs").readFileSync("../UPennDev/include2.lua",{encoding:'utf8'})
var ret = luavm.L.execute(str)
--]]
