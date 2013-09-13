/* Handle the onload of the mesh_image */
var mesh_click = function(e){
	// TODO: Allow scaled image clicking for zoom feature
	var sz = mesh_kinetic.getSize();
	// Get the mouse coordinates within the image
	var offset = mesh_kinetic.getPosition();
	var u = e.clientX - offset.x;
	var v = e.clientY - offset.y;
	// Get the image value
	var ctx = mesh_kinetic.getContext();
	var pixel = ctx.getImageData(u, v, 1, 1).data;
	var w = pixel[0];
	if(w==0||w==255){return;}
	
	/* Find the world coordinates */
	var hFOV = 58*Math.PI/180;
	var vFOV = 45*Math.PI/180;
	// Convert w of 0-255 to actual meters value
	// NOTE: Should receive this in the metadata, 
	// or from mesh request itself
	var near = .5, far = 2;
	var factor = (far-near)/255;
	// Convert form millimeters to meters
	var x = factor*w+near;
	var y = Math.tan(hFOV/2)*2*(u/sz.width-.5)*x;
	var z = Math.tan(vFOV/2)*2*(.5-v/sz.height)*x;
	// World coordinates are in meters
	console.log(w+' World: '+x+','+y+','+z);
}