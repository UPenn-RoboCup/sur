// TODO: Loop through all markdown documents...	
// TODO: Loop through all snaps js files and load
this.addEventListener("load", function () {
	"use strict";

	// Grab the body element
	var b = document.getElementsByTagName("body")[0],
		task_el = document.createElement('div'),
		marked = this.marked,
		MathJax = this.MathJax,
		qwest = this.qwest;
	
	function runMarked() {
		var marked_up = marked(task_el.innerHTML),
			svgs = document.querySelectorAll('#' + task_el.id + ' svg'),
			i,
			s;
		// Replace the double dash
		marked_up = marked_up.replace(/--/g, "&mdash;");
		//marked_up = marked_up.replace(/.../g,"&hellip;");
		// Place the element into the DOM
		task_el.innerHTML = marked_up;
		b.appendChild(task_el);
		for (i = 0; i < svgs.length; i = i + 1) {
			s = svgs[i];
//					// Fetch the correct drawing function, which is loaded externally
//					var sf = snaps[s.id];
//					if(sf!==undefined){
//						sf(s);
//						// Remove the associated image
//						var img_alt = document.querySelectorAll('img[alt="'+s.id+'"]')[0];
//						if(img_alt!==undefined){img_alt.parentNode.removeChild(img_alt);}
//					}
		}
	} // runMarked
	
	function runMathJax(text) {
		// Place the text into the element
		task_el.innerHTML = text;
		// Enqueue
		MathJax.Hub.Queue(["Typeset", MathJax.Hub, task_el]);
		MathJax.Hub.Queue(runMarked);
	} // runMathJax
	
	function loadTex(e) {
		qwest.get('/md/task', {}, {}, function () {this.responseType = 'text'; })
			.success(runMathJax);
	}
	
	// Name the div element
	task_el.id = "task";
	task_el.classList.add("chapter");
	// Only begin rendering when MathJax is loaded fully
	MathJax.Hub.Register.StartupHook("End", loadTex);
	
}); // Page load listener