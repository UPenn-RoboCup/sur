(function () {
	'use strict';

	function sendfsm(){
		util.shm(this, true);
	}

	function sendshm(){
		console.log(this);
		util.shm(
			'/shm/' + this.getAttribute("data-shm") +
			'/' + this.getAttribute("data-segment") +
			'/' + this.getAttribute("data-key"),
			JSON.parse(this.getAttribute("data-value"))
		);
	}

	function setup_buttons(fsm){
		var allBtns = document.querySelectorAll('#'+fsm+' button');
		for(var i = 0; i<allBtns.length; i+=1){
			var btn = allBtns.item(i);
			if(btn.parentNode.classList.contains("shm")){
				console.log(btn);
				btn.addEventListener('click', sendshm.bind(btn));
			} else if(btn.parentNode.classList.contains("fsm")){
				btn.addEventListener('click', sendfsm.bind(
					'/fsm/'+fsm+'/'+btn.id
				));
			}
		}

	}
	// Load everything
	Promise.all([
		//util.lcss('/css/gripper.css'),
		util.lcss('/css/gh-buttons.css'),
	]).then(function(){
		return util.lhtml('/view/fsm.html');
	}).then(function(view){
		document.body = view;
	}).then(function(){
		var allFSMs = document.querySelectorAll('.fsm');
		var i, div;
		for(i = 0; i<allFSMs.length; i+=1){
			div = allFSMs.item(i);
			setup_buttons(div.id);
		}
		var allSHMs = document.querySelectorAll('.shm');
		for(i = 0; i<allSHMs.length; i+=1){
			div = allSHMs.item(i);
			setup_buttons(div.id);
		}
	})
	.catch(function(e){
		console.log('Loaging Bug', e);
	});

}(this));
