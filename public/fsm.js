(function () {
	'use strict';

	function send(){
		util.shm(this, true);
	}

	function setup_buttons(fsm){
		var allBtns = document.querySelectorAll('#'+fsm+' button');
		console.log(allBtns);
		for(var i = 0; i<allBtns.length; i+=1){
			var btn = allBtns.item(i);
			btn.addEventListener('click', send.bind(
				'/fsm/'+fsm+'/'+btn.id
			));
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
		var allFSMs = document.querySelectorAll('.button-group');
		console.log(allFSMs);
		for(var i = 0; i<allFSMs.length; i+=1){
			var div = allFSMs.item(i);
			setup_buttons(div.id);
		}
	})
	.catch(function(e){
		console.log('Loaging Bug', e);
	});

}(this));
