/*jslint regexp: true*/
// TODO: Loop through all markdown documents...	
// TODO: Loop through all js_figures js files and load
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
		jsyaml = this.jsyaml,
		js_figures = {},
		figure_count = 0;
	
	// Must make globally available for dynamically loading figures
	this.js_figures = js_figures;
	
	function setFigures() {
		// Check if everything is available...
		if (!svg_script_el || !tex_done) {
			return;
		}
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
			sf = js_figures[s.id];
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
		svgs = document.querySelectorAll('img');
		n = svgs.length;
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
			i,
			nice_text;

		nice_text = marked_up
			.replace(/--/g, "&mdash;") // Replace the double dash
			.replace(/``/g, '"') // Replace the latex quotations
			.replace(/''/g, '"');
		//.replace(/.../g,"&hellip;");
		
		// Place the element into the DOM
		chapter_el.innerHTML = nice_text;
		// Place in the HTML
		b.appendChild(chapter_el);

		// Set flag
		tex_done = true;
	} // runMarked

	function runMathJax(text) {
		var title_patt, title_matches, title, authors, date,
			yaml_patt, yaml_matches, yaml_str, yaml_metadata;
		// Parse the Pandoc title block
		title_patt = new RegExp('% .*\n', 'g');
		title_matches = text.match(title_patt);
		text = text.replace(title_patt, '');
		// Set the title
		title = title_matches[0].replace(/(% |\n)/g, '');
		authors = title_matches[1].replace(/(% |\n)/g, '').split('; ');
		date = title_matches[1].replace(/(% |\n)/g, '');
		document.getElementsByTagName("title")[0].innerHTML = title;

		// Parse the YAML header
		yaml_patt = new RegExp('---\n(.|\n)*---\n', 'g');
		yaml_matches = text.match(yaml_patt);
		text = text.replace(yaml_patt, '');
		yaml_str = yaml_matches[0].replace('---\n', '').replace('---\n', '');
		yaml_metadata = jsyaml.safeLoad(yaml_str);

		// Kill off citations for now...
		text = text.replace(/\\cite\{.*\}/g, '');
		text = text.replace(/\[@.*\]/g, '');

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
		qwest.get('/figuresJS/' + chapter_el.id + '.js', {}, {}, function () {
			this.responseType = 'text';
		})
			.success(run_svgjs)
			.complete(setFigures);
	}

	// Set the div element as a chapter
	chapter_el.classList.add("chapter");
	// TODO: Which chapter to load
	chapter_el.id = "cut_the_rope";
	// Only begin rendering when MathJax is loaded fully
	MathJax.Hub.Register.StartupHook("End", loadTex);

}); // Page load listener
