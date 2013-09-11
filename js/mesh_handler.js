var mesh_layer = new Kinetic.Layer();
var mesh_kinetic;

var mesh_handler = function(e){
	/*
	// Set the canvas to the pixel data of the image
	var tmp_canvas    = document.createElement('canvas');
	tmp_canvas.width  = mesh_width;
	tmp_canvas.height = mesh_height;
	var ctx = tmp_canvas.getContext('2d')
	ctx.drawImage( this, 0, 0 );
	*/

	/* Kinetic addition */
	if(mesh_kinetic===undefined){
		mesh_kinetic = new Kinetic.Image({
		image:  mesh_img,
		//x: 32,
		//y: 50,
		//width:  100,
		//height: 100
		});
		// add the image to the layer
		mesh_layer.add(mesh_kinetic);
		// add the layer to the stage
		stage.add(mesh_layer);
	} else {
		mesh_kinetic.setRotationDeg(90);
		mesh_kinetic.setPosition(240, 0);
		// Redraw the image
		mesh_layer.draw();
		/*
		requestAnimationFrame( function(){
			mesh_layer.draw();
		});
		*/
	}
	
	// Remove the image for memory management reasons
	URL.revokeObjectURL(this.src);
	this.src = '';
}
