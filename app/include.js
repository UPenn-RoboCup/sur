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
	
	/* https://stackoverflow.com/questions/8586446/dynamically-load-external-javascript-file-and-wait-for-it-to-load-without-usi#8586564 */
	/* http://www.nczonline.net/blog/2009/07/28/the-best-way-to-load-external-javascript/ */
	/* http://unixpapa.com/js/dyna.html */
	/* https://kangax.github.io/nfe/ */
	// TODO: Work with Promises/A+
	function loadJS(src, callback) {
		"use strict";
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onreadystatechange = s.onload = function() {
        var state = s.readyState;
        if (!callback.done && (!state || /loaded|complete/.test(state))) {
            callback.done = true;
            callback();
        }
    };
    document.getElementsByTagName('head')[0].appendChild(s);
	}
	// Export
	ctx.loadJS = loadJS;
	/*
	loadJS('/script/script.js', function() { 
			// put your code here to run after script is loaded
	});
	*/
	
})(this);