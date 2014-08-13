/*
		Load JavaScript Asynchronously
		https://stackoverflow.com/questions/8586446/dynamically-load-external-javascript-file-and-wait-for-it-to-load-without-usi#8586564
		Load CSS Asynchronously
		http://otaqui.com/blog/1263/simple-script-to-load-css-from-javascript/
		*/
(function (ctx) {
	"use strict";

	function ljs(src, cb) {
		if (typeof src !== 'string') {
			return;
		}
		var scripts = document.getElementsByTagName('script'),
			len = scripts.length,
			i;
		for (i = 0; i < len; i = i + 1) {
			if (scripts[i].src.indexOf(src) !== -1) {
				return;
			}
		}
		var s = document.createElement('script');
		s.src = src;
		s.async = true;
		s.type = "application/javascript";
		if (typeof cb === 'function') {
			s.onreadystatechange = s.onload = function () {
				var state = s.readyState;
				if (!state || /loaded|complete/.test(state)) {
					setTimeout(cb);
				}
			};
		}
		document.getElementsByTagName('head')[0].appendChild(s);
	}

	function lcss(url, cb) {
		if (typeof url !== 'string') {
			return;
		}
		var links = document.getElementsByTagName('link'),
			len = links.length,
			i;
		for (i = 0; i < len; i = i + 1) {
			if (links[i].href.indexOf(url) !== -1) {
				return;
			}
		}
		var head = document.getElementsByTagName('head')[0],
			link = document.createElement('link');
		link.type = 'text/css';
		link.rel = 'stylesheet';
		link.href = url;
		if (typeof cb === 'function') {
			link.onreadystatechange = link.onload = function () {
				var state = link.readyState;
				if (!state || /loaded|complete/.test(state)) {
					setTimeout(cb);
				}
			};
		}
		head.appendChild(link);
	}
	// Exports
	// TODO: Pollute global namespace, or call these utils?
	ctx.util = {
		ljs: ljs,
		lcss: lcss
	};
}(this));