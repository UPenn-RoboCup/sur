(function (ctx) {
	'use strict';
	// Private variables
	var pow = Math.pow,
    abs = Math.abs,
    sqrt = Math.sqrt,
    tNeck, tKinect;
  
  // Load the Matrix library
	ctx.util.ljs('/js/sylvester-min.js');
  
  function always(p){ return true; }
  
  function* mesh_generator(mesh, filter){
    var indices = mesh.geometry.getAttribute('index').array,
      positions = mesh.geometry.getAttribute('position').array,
      offsets = mesh.geometry.drawcalls,
      pidx, p;
    if(typeof filter !== 'function'){ filter = always; }
    for ( var oi = 0, ol = offsets.length; oi < ol; ++oi ) {
			var start = offsets[ oi ].start,
			  count = offsets[ oi ].count,
			  index = offsets[ oi ].index;
			for ( var i = start, il = start + count; i < il; i += 3 ) {
        pidx = index + indices[ i ];
        p = [positions[3 * pidx], positions[3 * pidx + 1], positions[3 * pidx + 2]]
        //positions.subarray(3 * p, 3 * p + 3);
        if (filter(p)) { yield p; }
			}
    }
  }
  
  function* array_generator(arr){
    var i, l;
    for(i = 0, l = arr.length; i<l; i+=1){
      yield arr[i];
    }
  }
  function div1k(v){return v/1000;}

  function estimate_plane(it) {
    // Find all the points near it assuming upright
    var v,
      nClose = 0,
      xSum = 0,
      zSum = 0,
      ySum = 0,
      xxSum = 0,
      zzSum = 0,
      xzSum = 0,
      xySum = 0,
      zySum = 0;
    for (var p of it){
      // Avoid overflow
      v = p.map(div1k);
      //vA.sub(base);//.divideScalar(1000);
      // Compute the running nearest circle
      nClose += 1;
      xSum += v[0];
      zSum += v[2];
      ySum += v[1];
      //
      xxSum += pow(v[0], 2);
      zzSum += pow(v[2], 2);
      //
      xzSum += v[0] * v[2];
      xySum += v[0] * v[1];
      zySum += v[2] * v[1];
    }
    // http://stackoverflow.com/questions/1400213/3d-least-squares-plane
    var A_plane = $M([
      [zzSum, xzSum, zSum],
      [xzSum, xxSum, xSum],
      [zSum, xSum, nClose]
    ]);
    //window.console.log(A_plane.inspect());
    var b_plane = $V([zySum, xySum, ySum]);
    //window.console.log(b_plane.inspect());
    var A_plane_inv = A_plane.inv();
    var sol_plane = A_plane_inv.multiply(b_plane);
    var a = sol_plane.e(1),
      b = sol_plane.e(2);
    window.console.log(sol_plane);
    var normal = $V([-a, -b, 1]).toUnitVector();
    return {
      normal: [normal.e(2), normal.e(3), normal.e(1)],
    }
    
  }
  
  // Grow a plane from a parameter set
  // (x - h)^2 + (y - k)^2 = r^2
  // a(x - x0) + b(y - y0) + c(z - z0) == 0
  // n = [a b c]
  function grow_plane(it, params) {
    var plane_points = [],
    p0 = params.root,
    n = params.normal,
    err_r;
    
    // Find the valid sublevels based on how well the radius agrees
    // TODO: Use some probablity thing, maybe
    for (var p of it){
      err_r = abs( n[0]*(p[0] - p0[0]) + n[1]*(p[1] - p0[1]) + n[2]*(p[2] - p0[2]) );
      if (err_r < 5) { plane_points.push(p); }
    }
    
    // Update the parameters from these points
    var iter = new array_generator(plane_points);
    params = estimate_plane(iter);
    params.root = p0;
    
    return params;
  }

  // Estimate the grip using a vertical cyinder
  // y: up
  // x: left
  // z: forward
  function estimate_cylinder(it) {
    var v,
      nClose = 0,
      xSum = 0,
      xxSum = 0,
      zSum = 0,
      zzSum = 0,
      xzSum = 0,
      xxxSum = 0,
      zzzSum = 0,
      xzzSum = 0,
      xxzSum = 0;
    for (var p of it){
      // Avoid overflow
      v = p.map(div1k);
      // Compute the running nearest circle
      nClose += 1;
      xSum += v[0];
      zSum += v[2];
      xxSum += pow(v[0], 2);
      zzSum += pow(v[2], 2);
      xzSum += v[0] * v[2];
      xzzSum += v[0] * pow(v[2], 2);
      xxzSum += pow(v[0], 2) * v[2];
      xxxSum += pow(v[0], 3);
      zzzSum += pow(v[2], 3);
    }
    // http://www.geometrictools.com/Documentation/CylinderFitting.pdf
    // http://www.physics.oregonstate.edu/paradigms/Publications/ConicSections.html
    // http://www.had2know.com/academics/best-fit-circle-least-squares.html
    var Amat = $M([
      [zzSum, xzSum, zSum],
      [xzSum, xxSum, xSum],
      [zSum, xSum, nClose]
    ]);
    //window.console.log(Amat.inspect());
    var bvec = $V([
      xxzSum + zzzSum,
      xzzSum + xxxSum,
      zzSum + xxSum
    ]);
    var Amat_inv = Amat.inv();
    var Ainv_bvec = Amat_inv.multiply(bvec);
    var zc = Ainv_bvec.e(1) / 2 * 1000,
      xc = Ainv_bvec.e(2) / 2 * 1000,
      r = sqrt(4 * Ainv_bvec.e(3) + pow(Ainv_bvec.e(1), 2) + pow(Ainv_bvec.e(2), 2)) / 2 * 1000;
    return {
      r: r,
      xc: xc,
      zc: zc,
    };
  }

  // Grow a cylinder from a parameter set
  // (x - h)^2 + (y - k)^2 = r^2
  function grow_cylinder(it, params) {
    var sublevels = [],
      err_r;
    
    // Find the valid sublevels based on how well the radius agrees
    // TODO: Use some probablity thing, maybe
    
    for (var p of it){
      err_r = sqrt(pow(p[0] - params.xc, 2) +  pow(p[2] - params.zc, 2)) - params.r;
      if (err_r < 7) { sublevels.push(p); }
    }
    
    // Get the connected region that includes the clicked point
    var goodlevels = sublevels.sort(function(first, second){
      if (first[1] === second[1]){return 0;} else if (first[1] < second[1]){return -1;} else{return 1;}
    });
    var y0_is_seen = false,
      i_lower = 0, i_upper = goodlevels.length,
      p_lower = goodlevels[i_lower], p_upper = goodlevels[i_upper - 1],
      p, p_last;
    // TODO: Get statistics, now, so we know some noise ideas?
    for(var si = 1, sl = goodlevels.length; si < sl; si += 1) {
      p = goodlevels[si];
      p_last = goodlevels[si - 1];
      if (abs(p[1] - params.yc) < 10) { y0_is_seen = true; }
      // 1cm discepancy is a break
      if (p[1] - p_last[1] > 5) {
        if(y0_is_seen){
          i_upper = si;
          p_upper = p_last;
        } else {
          i_lower = si;
          p_lower = p;
        }
      }
    }
    
    // Filter to only the points we want
    var valid_cyl_points = goodlevels.filter(function(value, index, arr){
      return index>=i_lower && index<i_upper;
    });
    
    // Update the parameters from these points
    var iter = new array_generator(valid_cyl_points);
    params = estimate_cylinder(iter);
    params.h = p_upper[1] - p_lower[1];
    params.yc = (p_upper[1] + p_lower[1]) / 2;
    
    return params;
  }
  
  
  
  ctx.Estimate = {
    cylinder: function(mesh0, p0){
      var px = p0.x,
        py = p0.y,
        pz = p0.z,
        it = new mesh_generator(mesh0, function(vertex) {
          // TODO: Tune these values
          return abs(vertex[1] - py) < 5 && abs(vertex[0] - px) < 50 && abs(vertex[2] - pz) < 50;
        });
      var parameters = estimate_cylinder(it);
      parameters.yc = py;
      // Grow to update
      it = new mesh_generator(mesh0);
      parameters = grow_cylinder(it, parameters);
      return parameters;
    },
    plane: function(mesh0, p0){
      var px = p0.x,
        py = p0.y,
        pz = p0.z,
        it = new mesh_generator(mesh0, function(vertex) {
          // TODO: Tune these values
          return abs(vertex[1] - py) < 5 && abs(vertex[0] - px) < 50 && abs(vertex[2] - pz) < 50;
        });
      var parameters = estimate_plane(it);
      parameters.root = [px,py,pz];
      console.log(parameters);
      
      // Grow to update
      it = new mesh_generator(mesh0);
      parameters = grow_plane(it, parameters);
      console.log(parameters);
      
      return parameters;
    }
  }

}(this));