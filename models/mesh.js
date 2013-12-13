/*****
 * Mesh object for buttons and data associated with robot meshes
 */
(function(ctx){
  
  // Object to hold our various setup/interaction methods from main.js
  function Mesh(){}
  
  // Temporary image for handlining incoming Blob URL
  var mesh_img = new Image();
  var mesh_in_use = 'chest_lidar';
  
  // Setup the meshes we will use
  var meshes = {};
  meshes.chest_lidar = {};
  meshes.head_lidar  = {};
  
  // Setup common mesh properties
  for(var m in meshes){
    var mesh = meshes[m];
    var raw = document.createElement("canvas");
    // Dummy initial values
    raw.setAttribute('width', 500);
    raw.setAttribute('height', 500);
    // save in our object
    mesh.raw = raw;
    mesh.ctx = raw.getContext('2d');
    mesh.fov = [0,0,0,0];
  }
  /*******
  * Websocket callback upon receiving an image
  ******/
  var mesh_handler = function(e){
    var w   = this.width;
    var h   = this.height;
    var img = this;

    // useful information
    var half_w = w/2;
    var half_h = h/2;
    var diff   = (h-w)/2;

    // Select the mesh context based upon which image was loaded
    var mesh = meshes[this.alt];
    var raw_ctx = mesh.ctx;

    // Rotate if the chest...
    switch(this.alt){
      case 'head_lidar':
        raw_ctx.save();
        // flip context horizontally
        raw_ctx.translate(half_w, 0);
        raw_ctx.scale(-1, 1);
        raw_ctx.translate(-half_w, 0);
        // draw
        head_mesh_raw_ctx.drawImage(this, 0, 0);
        // restore
        raw_ctx.restore();
        // Set the right height and width
        mesh.width  = w;
        mesh.height = h;
        break;
      case 'chest_lidar':
        raw_ctx.save();
        raw_ctx.translate(half_w, half_h);
        // rotate canvas
        raw_ctx.rotate(Math.PI/2);
        // if the image is not square, 
        // add half the difference of the smaller to the larger one
        half_h+=diff;
        half_w+=diff;
        raw_ctx.drawImage(this, -half_w, -half_h);
        raw_ctx.restore();
        // Set the right height and width
        mesh.width  = h;
        mesh.height = w;
        break;
      case 'kinect':
        mesh.width  = w;
        mesh.height = h;
        raw_ctx.drawImage(this, 0, 0);
        break;
    }

    // Remove the image for memory management reasons
    URL.revokeObjectURL(this.src);
    this.src = '';

    // Place in the 3D scene
    World.digest_mesh(mesh);

  } // Handle a new mesh
  
  /*******
  * Websocket setup
  ******/
  Mesh.setup = function(){
    
    // Websocket Configuration
    //var mesh_port = 9004; // kinect
    var port = 9001; // lidar
    
    // checksum & metadata
    var fr_sz_checksum, fr_metadata;
    
    // Connect to the websocket server
    var ws = new WebSocket('ws://' + host + ':' + port);
    ws.binaryType = "blob";

    // Send data to the webworker
    ws.onmessage = function(e){
      if(typeof e.data === "string"){
        // Need to save the metadata for next frame
        fr_metadata  = JSON.parse(e.data);
        //console.log('fr_metadata debug',fr_metadata);
        
        var mesh     = meshes[fr_metadata.name];
        //mesh.pitch   = fr_metadata.rpy[1];
        mesh.pitch   = 11*Math.PI/180;
        mesh.latency = e.timeStamp/1e6 - fr_metadata.t;
        mesh.depths  = fr_metadata.depths.slice();
        //
        mesh.posex   = fr_metadata.posex.slice();
        mesh.posey   = fr_metadata.posey.slice();
        mesh.posez   = fr_metadata.posez.slice();
        //
        var fov = mesh.fov;
        if(fr_metadata.name=='chest_lidar'){
          fov[0] = fr_metadata.scanlines[0]; // horiz start
          fov[1] = fr_metadata.scanlines[1]; // horiz end
          fov[2] = fr_metadata.fov[0]; // vert start
          fov[3] = fr_metadata.fov[1]; // vert end
        } else {
          mesh.fov[0] = fr_metadata.fov[0]; // horiz start
          mesh.fov[1] = fr_metadata.fov[1]; // horiz end
          mesh.fov[2] = fr_metadata.scanlines[0]; // vert start
          mesh.fov[3] = fr_metadata.scanlines[1]; // vert end
        }
        return;
      }
		
      // Use the size as a sort of checksum
      // for metadata pairing with an incoming image
      fr_sz_checksum = e.data.size;
      if(fr_metadata.sz!==fr_sz_checksum){
        console.log('Checksum fail!',fr_metadata.sz,fr_sz_checksum);
        return;
      }
      last_mesh_img = e.data;
      requestAnimationFrame( function(){
        // Put received JPEG/PNG data into the image
        mesh_img.src = URL.createObjectURL(
          last_mesh_img.slice(0,last_mesh_img.size,'image/'+fr_metadata.c)
        );
        mesh_img.alt = fr_metadata.name;
        // Trigger processing once the image is fully loaded
        mesh_img.onload = mesh_handler;
      }); //animframe
    };
  } // Websocket handling
  
  // export
	ctx.Mesh = Mesh;

})(this);