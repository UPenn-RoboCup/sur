(function (ctx) {
	'use strict';
  
  // Load the Matrix library
  ctx.util.ljs('/js/numeric-1.2.6.min.js');
  
	var pow = Math.pow,
    abs = Math.abs,
    sqrt = Math.sqrt,
    tNeck, tKinect;
  
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

  function estimate_plane(it, root) {
    // Find all the points near it assuming upright
    var v,
      nClose = 0,
      xSum = 0,
      zSum = 0,
      ySum = 0,
      xxSum = 0,
      zzSum = 0,
      yySum = 0,
      xzSum = 0,
      xySum = 0,
      zySum = 0;
    for (var p of it){
      // Avoid overflow
      v = [
        (p[0]-root[0]) / 1000,
        (p[1]-root[1]) / 1000,
        (p[2]-root[2]) / 1000
      ];
      // Compute the running nearest circle
      nClose += 1;
      xSum += v[0];
      zSum += v[2];
      ySum += v[1];
      //
      xxSum += pow(v[0], 2);
      zzSum += pow(v[2], 2);
      yySum += pow(v[1], 2);
      //
      xzSum += v[0] * v[2];
      xySum += v[0] * v[1];
      zySum += v[2] * v[1];
    }
    
    var A_plane_inv = numeric.inv([
      [zzSum, xzSum, zSum],
      [xzSum, xxSum, xSum],
      [zSum, xSum, nClose]
    ]);
    var sol_plane = numeric.dot(A_plane_inv, [zySum, xySum, ySum]);
    var normal = [-sol_plane[0], -sol_plane[1], 1];
    var nrm = numeric.norm2(normal);
    normal[0] = normal[0] / nrm;
    normal[1] = normal[1] / nrm;
    normal[2] = normal[2] / nrm;
    
    // TODO: Add the standard deviation
    function divN(v){return v / (nClose + 1);}
    // diagonal entries
    var d = [
      xxSum - pow(xSum,2)/nClose,
      zzSum - pow(zSum,2)/nClose,
      yySum - pow(ySum,2)/nClose
    ].map(divN);
    // off diagonals: xz, xy, zy
    var of = 2 / nClose + nClose,
      o = [
      xzSum - of*xSum*zSum,
      xySum - of*xSum*ySum,
      zySum - of*zSum*ySum
    ].map(divN);
    var cov = [
      [d[0],o[0],o[1]],
      [o[0],d[1],o[2]],
      [o[1],o[2],d[2]]
    ];
    
    // d[2] is the variance in the y direction only... find variance in the normal direction. Should be the third eigenvalue....
    
    var root2 = [xSum, ySum, zSum].map(function(v,i){return 1000*v/nClose + root[i];});
    return {
      normal: [normal[1], normal[2], normal[0]],
      root: root2,
      cov: cov
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
    err_r,
    total_err = 0;
    
    // Find the valid sublevels based on how well the radius agrees
    // TODO: Use some probablity thing, maybe
    for (var p of it){
      err_r = abs( n[0]*(p[0] - p0[0]) + n[1]*(p[1] - p0[1]) + n[2]*(p[2] - p0[2]) );
      if (err_r < 5) {
        plane_points.push(p);
        total_err += err_r;
      }
    }
    
    // Update the parameters from these points
    var iter = new array_generator(plane_points);
    params = estimate_plane(iter, p0);
    params.error = total_err;
    params.npoints = plane_points.length;
    
    return params;
  }
  
  // Give a good idea of noise in the planar estimation
  function plane_noise(params) {
    var eigs = numeric.eig(params.cov);
    console.log(eigs.lambda);
    console.log(eigs.E);
    // Smallest eigenvector represents the variance in the normal vector direction
  }

  // Estimate the grip using a vertical cyinder
  // y: up
  // x: left
  // z: forward
  function estimate_cylinder(it, root) {
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
      v = [
        (p[0]-root[0]) / 1000,
        (p[1]-root[1]) / 1000,
        (p[2]-root[2]) / 1000
      ];
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
    //window.console.log(Amat.inspect());
    var Amat_inv = numeric.inv([
      [zzSum, xzSum, zSum],
      [xzSum, xxSum, xSum],
      [zSum, xSum, nClose]
    ]);
    var Ainv_bvec = numeric.dot(Amat_inv, [
      xxzSum + zzzSum,
      xzzSum + xxxSum,
      zzSum + xxSum
    ]);
    return {
      r: sqrt(4 * Ainv_bvec[2] + pow(Ainv_bvec[0], 2) + pow(Ainv_bvec[1], 2)) / 2 * 1000,
      xc: Ainv_bvec[1] / 2 * 1000 + root[0],
      yc: root[1],
      zc: Ainv_bvec[0] / 2 * 1000 + root[2],
      root: root,
    };
  }

  // Grow a cylinder from a parameter set
  // (x - h)^2 + (y - k)^2 = r^2
  function grow_cylinder(it, params) {
    var sublevels = [],
    err_r,
    total_err = 0;
    
    // Find the valid sublevels based on how well the radius agrees
    // TODO: Use some probablity thing, maybe
    
    for (var p of it){
      err_r = sqrt(pow(p[0] - params.xc, 2) +  pow(p[2] - params.zc, 2)) - params.r;
      if (err_r < 8) {
        sublevels.push(p);
        total_err += err_r;
      }
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
    params = estimate_cylinder(iter, params.root);
    params.h = p_upper[1] - p_lower[1];
    params.yc = (p_upper[1] + p_lower[1]) / 2;
    
    params.error = total_err;
    params.npoints = valid_cyl_points.length;
    
    return params;
  }
  
  // TODO: Tune the filters (for the generator)
  ctx.Estimate = {
    cylinder: function(mesh0, p0){
      var px = p0.x,
        py = p0.y,
        pz = p0.z,
        root = [px,py,pz],
        it = new mesh_generator(mesh0, function(vertex) {
          return abs(vertex[1] - py) < 5 && abs(vertex[0] - px) < 50 && abs(vertex[2] - pz) < 50;
        });
      var parameters = estimate_cylinder(it, root);
      //console.log(parameters);
      
      // Grow to update
      it = new mesh_generator(mesh0);
      parameters = grow_cylinder(it, parameters);
      //console.log(parameters);
      
      return parameters;
    },
    plane: function(mesh0, p0){
      var px = p0.x,
        py = p0.y,
        pz = p0.z,
        root = [px,py,pz],
        horizontal_it = new mesh_generator(mesh0, function(vertex) {
          return abs(vertex[1] - py) < 5 && abs(vertex[0] - px) < 50 && abs(vertex[2] - pz) < 50;
        }),
        vertical_it = new mesh_generator(mesh0, function(vertex) {
          return abs(vertex[1] - py) < 50 && abs(vertex[0] - px) < 50 && abs(vertex[2] - pz) < 5;
        }),
        epp_horiz = Infinity,
        epp_vert = Infinity;
      var horiz_params = estimate_plane(horizontal_it, root);
      horiz_params.root = [px,py,pz];
      //console.log(horiz_params);
      // Grow to update
      // TODO: Use the covariance to determine the ranges here
      horiz_params = grow_plane(new mesh_generator(mesh0, function(vertex) {
          return abs(vertex[1] - py) < 10 && abs(vertex[0] - px) < 500 && abs(vertex[2] - pz) < 500;
        }), horiz_params);
      epp_horiz = horiz_params.error / horiz_params.npoints;
      //console.log(horiz_params);
      
      var vert_params = estimate_plane(vertical_it, root);
      vert_params.root = [px,py,pz];
      //console.log(vert_params);
      // Grow to update
      vert_params = grow_plane(new mesh_generator(mesh0, function(vertex) {
          return abs(vertex[1] - py) < 500 && abs(vertex[0] - px) < 500 && abs(vertex[2] - pz) < 50;
        }), vert_params);
      epp_vert = vert_params.error / vert_params.npoints;
      //console.log(vert_params);
      
      // Choose if vertical or horizontal
      if (epp_horiz < epp_vert) {
        horiz_params.id = 'h';
        //console.log(horiz_params);
        return horiz_params;
      } else {
        vert_params.id = 'v';
        //console.log(vert_params);
        return vert_params;
      }
      
    }
  }

}(this));