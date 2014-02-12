this.addEventListener("load", function () {
	"use strict";
	
	// Grab the body element
	var b = $('body')[0];
	
	// TODO: Loop through all markdown documents...	
	var task_el = document.createElement('div');
	task_el.id = "task";
	
	// Load resources and render
	qwest.get('/md/task',{},{},function(){this.responseType='text';}).success(function(text){
		
		// Place the text into the element
		task_el.innerHTML = text;
		// Typeset the element
		MathJax.Hub.Typeset(task_el,function(e){
			// Process the markdown after the math is parsed
			// This is a more flexible method, and we can
			// use even \begin{} things...
			task_el.innerHTML = marked(task_el.innerHTML);
			// Place the element into the DOM
			b.appendChild(task_el);
		});
		// Done the GET request
	});
	
}); // Page load listener