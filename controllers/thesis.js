this.addEventListener("load", function () {
	"use strict";
	
	// Grab the body element
	var b = $('body')[0];
	
	// Load resources and render
	qwest.get('/md/task',{},{},function(){console.log(this);this.responseType='text';}).success(function(text){
		//console.log(this);
		// We have the markdown text now, so let's parse it
		var md_html = marked(text);
		// Add this html to the page
		var math_el = document.createElement('div');
		math_el.innerHTML = md_html;
		// Now let's put through mathjax
		MathJax.Hub.Queue(["Typeset",MathJax.Hub,math_el]);
		b.appendChild(math_el);
	});
	
});