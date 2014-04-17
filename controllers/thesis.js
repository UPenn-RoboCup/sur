// TODO: Loop through all markdown documents...	
// TODO: Loop through all snaps js files and load
this.addEventListener("load", function () {
	"use strict";

	// Grab the body element
	var b = document.getElementsByTagName("body")[0],
		head_el = document.getElementsByTagName('head').item(0),
		chapter_el = document.createElement('div'),
		svg_script_el,
		tex_done = false,
		marked = this.marked,
		MathJax = this.MathJax,
		qwest = this.qwest,
		snaps = {},
		figure_count = 0;
	this.snaps = snaps;
	
	function setFigures() {
		// Check if everything is available...
		if (!svg_script_el || !tex_done) {
			return;
		}
		//window.console.log('here');
		// Grab the SVG elements inside this chapter
		var svgs = document.querySelectorAll('#' + chapter_el.id + ' svg'),
			n = svgs.length,
			i = 0,
			s,
			sf,
			prev,
			caption,
			caption_el;
		// Replace each figure with SVG if possible
		for (i = 0; i < n; i = i + 1) {
			s = svgs[i];
			// Fetch the correct drawing function, which is loaded externally
			sf = snaps[s.id];
			if (sf !== undefined) {
				sf(s);
				figure_count = figure_count + 1;
				// Remove the associated image
				prev = s.previousElementSibling;
				if (prev && prev.hasChildNodes() && prev.lastChild.tagName === 'IMG') {
					caption = prev.lastChild.alt;
					prev.parentNode.removeChild(prev);
				} else if (prev && prev.tagName === 'IMG') {
					caption = prev.alt;
					prev.parentNode.removeChild(prev);
				}
				// Add the caption
				caption_el = document.createElement('div');
				caption_el.innerHTML = 'Figure ' + figure_count + ': ' + caption;
				caption_el.classList.add('caption');
				s.parentNode.insertBefore(caption_el, s.nextSibling);
			}
		}
		svgs = document.querySelectorAll('img'),
			n = svgs.length,
			i = 0;
		for (i = 0; i < n; i = i + 1) {
			figure_count = figure_count + 1;
			s = svgs[i];
			// Add the caption for images
			caption_el = document.createElement('div');
			caption_el.innerHTML = 'Figure ' + figure_count + ': ' + s.alt;
			caption_el.classList.add('caption');
			s.parentNode.insertBefore(caption_el, s.nextSibling);
		}
				
	}

	function run_svgjs(snippet) {
		svg_script_el = document.createElement("script");
		svg_script_el.language = "javascript";
		svg_script_el.type = "text/javascript";
		svg_script_el.id = chapter_el.id + '_svg';
		svg_script_el.defer = true; // unsure why...
		svg_script_el.text = snippet;
		head_el.appendChild(svg_script_el);
	}

	function runMarked() {
		var marked_up = marked(chapter_el.innerHTML),
			heading,
			heading_el,
			title,
			authors,
			date,
			i;
		// Replace the double dash
		marked_up = marked_up.replace(/--/g, "&mdash;");
		//marked_up = marked_up.replace(/.../g,"&hellip;");
		// Replace the latex quotations
		marked_up = marked_up.replace(/``/g, '"');
		marked_up = marked_up.replace(/''/g, '"');
		//window.console.log(date);
		/*
		title = marked_up.match(/%.+/);
		if(title){
			window.console.log(title);
			title = title[0].substr(2);
			marked_up = marked_up.replace(/%.+/, '');
			authors = marked_up.match(/%.+/);
			if(authors){
				authors = authors[0].substr(2);
				marked_up = marked_up.replace(/%.+/, '');
				date = marked_up.match(/%.+/);
				if(date){
					date = date[0].substr(2);
					marked_up = marked_up.replace(/%.+/, '');
				}
			}
		}
		window.console.log(title);
		window.console.log(authors);
		window.console.log(date);
		*/
		
		// Place the element into the DOM
		chapter_el.innerHTML = marked_up;
		// Place in the HTML
		b.appendChild(chapter_el);
		
		// Find the title block, a la Pandoc
		heading_el = chapter_el.firstChild;
		if (heading_el && heading_el.innerHTML[0] === '%') {
			heading = heading_el.innerHTML.match(/%.+/g);
			chapter_el.removeChild(heading_el);
			title = heading[0].substr(2);
			authors = heading[1].substr(2);
			date = heading[2].substr(2);
			// TODO: Process
			document.getElementsByTagName("title")[0].innerHTML = title;
		}
		
		// Set flag
		tex_done = true;
	} // runMarked

	function runMathJax(text) {
		// Place the text into the element
		chapter_el.innerHTML = text;
		// Enqueue
		MathJax.Hub.Queue(["Typeset", MathJax.Hub, chapter_el]);
		MathJax.Hub.Queue(runMarked);
		// Try fixing the figures always...?
		MathJax.Hub.Queue(setFigures);
	} // runMathJax

	function loadTex(e) {
		// Load the text
		qwest.get('/md/' + chapter_el.id, {}, {}, function () {
			this.responseType = 'text';
		})
			.success(runMathJax);
		// Load the SVG replacement code
		qwest.get('/snap/' + chapter_el.id + '.js', {}, {}, function () {
			this.responseType = 'text';
		})
			.success(run_svgjs)
			.complete(setFigures);
	}

	// Set the div element as a chapter
	chapter_el.classList.add("chapter");
	// TODO: Which chapter to load
	chapter_el.id = "swipe_radon";
	// Only begin rendering when MathJax is loaded fully
	MathJax.Hub.Register.StartupHook("End", loadTex);

}); // Page load listener