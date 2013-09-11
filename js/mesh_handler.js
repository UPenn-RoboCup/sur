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
	var mesh_kinetic = new Kinetic.Image({
		x: 32,
		y: 50,
		image:  mesh_img,
		width:  100,
		height: 100
	});
	// add the image to the layer
    layer.add(mesh_kinetic);

	// add the layer to the stage
	stage.add(layer);
		
	// Remove the image for memory management reasons
	URL.revokeObjectURL(this.src);
	this.src = '';
		
	// Send the pixel data to the worker for processing
	/*
	var myCanvasData = ctx.getImageData(0, 0, fr_width, fr_height).data;
	frame_worker.postMessage(myCanvasData.buffer, [myCanvasData.buffer]);
	*/

	/*
	// After posting the data, let's rotate or something
	var dcanvas = $("#depthmap")[0];
	dcanvas.width = fr_height;
	dcanvas.height = fr_width;
	var dcanv_ctx = dcanvas.getContext('2d');
	dcanv_ctx.save();
	dcanv_ctx.translate( fr_width/2, -fr_height/2 );
	dcanv_ctx.scale(-1, 1);
	dcanv_ctx.rotate( Math.PI/2 );
	dcanv_ctx.drawImage( tmp_canvas, fr_height/2, -fr_width/2 );
	dcanv_ctx.restore();
	*/
}