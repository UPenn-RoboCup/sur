var mesh_layer = new Kinetic.Layer();
var mesh_kinetic;
/* Handle the onload of the mesh_image */
var mesh_handler = function(e){
	/* Kinetic addition */
	if(mesh_kinetic===undefined){
		mesh_kinetic = new Kinetic.Image({
		image: this,
		//x: 30,
		//y: 50,
		width:  this.width,
		height: this.height
		});
		// add the image to the layer
		mesh_layer.add(mesh_kinetic);
		// add the layer to the stage
		stage.add(mesh_layer);
		// add click handling for this image
		if(mesh_click!==undefined){
			mesh_kinetic.on('click', mesh_click);
		}
	} else {
		// Below is for rotation of the chest_mesh!
		/*
		mesh_kinetic.setRotationDeg(90);
		mesh_kinetic.setPosition(this.height, 0);
		*/
		// Redraw the image
		mesh_layer.draw();
	}
	
	// Remove the image for memory management reasons
	URL.revokeObjectURL(this.src);
	this.src = '';
}