// Useful (globally accessible) functions
this.hostname = this.location.hostname;
if (!this.hostname) {
	this.hostname = 'localhost';
	this.origin = 'http://localhost:8080';
} else {
	this.origin = this.location.origin;
}
this.fsm_url  = this.origin + '/s';
this.body_url = this.origin + '/b';
this.shm_url  = this.origin + '/m';
// Override get/set
this.so_url = this.shm_url + '/m/hcm/state/override';
this.rpc_url_proceed = this.shm_url + '/m/hcm/state/proceed';
// how far in the future is the operator (in seconds)?
this.time_offset = 0.7;
// http://macwright.org/presentations/dcjq/
this.$ = function (x) {
	"use strict";
	return this.document.querySelectorAll(x);
};
this.clicker = function (id, fun) {
	"use strict";
	if (typeof id === 'string') {
		var id_el = this.document.getElementById(id);
		if (id_el === null) {
			return false;
		}
		return this.Hammer(id_el).on('tap', fun);
	}
	if (id === null || id === undefined) {
		return false;
	}
	return this.Hammer(id).on('tap', fun);
};
this.unclicker = function (id, fun) {
	"use strict";
	if (typeof id === 'string') {
		var id_el = this.document.getElementById(id);
		if (id_el === null) {
			return false;
		}
		return this.Hammer(id_el).off('tap', fun);
	}
	if (id === null || id === undefined) {
		return false;
	}
	return this.Hammer(id).off('tap', fun);
};
this.DEG_TO_RAD = Math.PI / 180;
this.RAD_TO_DEG = 180 / Math.PI;
