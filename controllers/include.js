// Useful (globally accessible) functions
(function(ctx){
	ctx.hostname = ctx.location.hostname;
	if (!ctx.hostname) {
		ctx.hostname = 'localhost';
		ctx.origin = 'http://localhost:8080';
	} else {
		ctx.origin = ctx.location.origin;
	}
	ctx.fsm_url  = ctx.origin + '/s';
	ctx.body_url = ctx.origin + '/b';
	ctx.shm_url  = ctx.origin + '/m';
	// Override get/set
	ctx.so_url = ctx.shm_url + '/m/hcm/state/override';
	ctx.rpc_url_proceed = ctx.shm_url + '/m/hcm/state/proceed';
	// how far in the future is the operator (in seconds)?
	ctx.time_offset = 0.7;
	// http://macwright.org/presentations/dcjq/
	ctx.$ = function (x) {
		"use strict";
		return ctx.document.querySelectorAll(x);
	};
	ctx.clicker = function (id, fun) {
		"use strict";
		if (typeof id === 'string') {
			var id_el = ctx.document.getElementById(id);
			if (id_el === null) {
				return false;
			}
			return ctx.Hammer(id_el).on('tap', fun);
		}
		if (id === null || id === undefined) {
			return false;
		}
		return ctx.Hammer(id).on('tap', fun);
	};
	ctx.unclicker = function (id, fun) {
		"use strict";
		if (typeof id === 'string') {
			var id_el = ctx.document.getElementById(id);
			if (id_el === null) {
				return false;
			}
			return ctx.Hammer(id_el).off('tap', fun);
		}
		if (id === null || id === undefined) {
			return false;
		}
		return ctx.Hammer(id).off('tap', fun);
	};
	ctx.DEG_TO_RAD = Math.PI / 180;
	ctx.RAD_TO_DEG = 180 / Math.PI;
})(this);