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
	console.log('Pixel',u,v,w);
	
	/* Find the world coordinates */
	var hFOV = 58*Math.PI/180;
	var vFOV = 45*Math.PI/180;
	// TODO: Convert w of 0-255 to bitshifted actual value
	var x = w;
	var y = Math.tan(hFOV/2)*2*(u/sz.width -.5)*x;
	var z = Math.tan(vFOV/2)*2*(v/sz.height-.5)*w;
	console.log('World',x,y,z);
}