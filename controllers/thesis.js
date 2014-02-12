this.addEventListener("load", function () {
	"use strict";
	
	// Grab the body element
	var b = $('body')[0];
	
	// TODO: Loop through all markdown documents...	
	var task_el = document.createElement('div');
	task_el.id = "task";
	task_el.classList.add("chapter");
	
	// Load resources and render
	qwest.get('/md/task',{},{},function(){this.responseType='text';}).success(function(text){
		
		// Place the text into the element
		task_el.innerHTML = text;
		// Typeset the element
		MathJax.Hub.Typeset(task_el,function(e){
			// Process the markdown after the math is parsed
			// This is a more flexible method, and we can
			// use even \begin{} things...
			var marked_up = marked(task_el.innerHTML);
			// Replace the double dash
			marked_up = marked_up.replace(/--/g,"&mdash;");
			//marked_up = marked_up.replace(/.../g,"&hellip;");
			// Place the element into the DOM
			task_el.innerHTML = marked_up;
			b.appendChild(task_el);
			// TODO: Fetch the SVG JavaScript based on the id :)
			var svgs = $('#'+task_el.id+' svg');
			for(var i=0;i<svgs.length;i++){add_svg(svgs[i]);}
		});
		// Done the GET request
	});
	
	function add_svg(el){
		console.log(el);
		var s = Snap(el);
		var bigCircle = s.circle(150, 150, 100);
	}
	
}); // Page load listener