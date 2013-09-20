var camera_layer = new Kinetic.Layer();
var camera_kinetic;
/* Handle the onload of the camera_image */
var camera_handler = function(e){
	console.log('here')
	/* Kinetic addition */
	if(camera_kinetic===undefined){
		camera_kinetic = new Kinetic.Image({
		image: this,
		//x: 30,
		//y: 50,
		width:  this.width,
		height: this.height
		});
		// add the image to the layer
		camera_layer.add(camera_kinetic);
		// add the layer to the stage
		stage.add(camera_layer);
	}
	// Redraw the image
	camera_layer.draw();
	
	// Remove the image for memory management reasons
	URL.revokeObjectURL(this.src);
	this.src = '';
}