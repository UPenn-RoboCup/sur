(function () {
	'use strict';

	function send(){
		util.shm('/fsm/Gripper/'+this, true);
	}

	function setup_buttons(){
		var allBtns = document.querySelectorAll('#gripevents button');
		for(var i = 0; i<allBtns.length; i+=1){
			var btn = allBtns.item(i);
			btn.addEventListener('click', send.bind(btn.id));
		}
	}
	// Load everything
	Promise.all([
		//util.lcss('/css/gripper.css'),
		util.lcss('/css/gh-buttons.css'),
	]).then(function(){
		return util.lhtml('/view/gripper.html');
	}).then(function(view){
		document.body = view;
	}).then(setup_buttons)
	.catch(function(e){
		console.log('Loaging Bug', e);
	});

}(this));
