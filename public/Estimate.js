(function (ctx) {
	'use strict';
  // Load the Matrix library
  ctx.util.ljs('/js/numeric-1.2.6.min.js');
  
	var pow = Math.pow,
    abs = Math.abs,
    sqrt = Math.sqrt,
    exp = Math.exp,
    min = Math.min,
    PI = Math.PI,
    atan = Math.atan,
    atan2 = Math.atan2,
    sin = Math.sin,
    cos = Math.cos,
    floor = Math.floor;
    
    /*
    var eigs = numeric.eig(params.cov);
    console.log(eigs.lambda);
    console.log(eigs.E);
    var c_eigs = numeric.eig(c_cov);
    console.log(c_eigs.lambda);
    console.log(c_eigs.E);
    console.log('color inv', numeric.inv(c_cov));
    console.log('c_u', c_u);
    console.log('c_cov', c_cov);
    */
    
  // Ground classifier
  // Larger it is, then more ground-y it is
  function h_ground(params){
    return numeric.dotVV(params.normal, [0,1,0]) * (1 + 1/abs(params.root[1]/1000));
  }
  
  function normalize(n){
    var nrm = numeric.norm2(n);
    return [ n[0] / nrm, n[1] / nrm, n[2] / nrm ];
  }
  
  /*
  function* mesh_entries_original(mesh, filter){
    var indices = mesh.geometry.getAttribute('index').array,
      positions = mesh.geometry.getAttribute('position').array,
      colors = mesh.geometry.getAttribute('color').array,
      offsets = mesh.geometry.drawcalls,
      filter = filter || function(p){return true;},
      pidx, data;
    for ( var oi = 0, ol = offsets.length; oi < ol; ++oi ) {
			var start = offsets[ oi ].start,
			  count = offsets[ oi ].count,
			  index = offsets[ oi ].index;
			for ( var i = start, il = start + count; i < il; i += 3 ) {
        pidx = index + indices[ i ];
        data = [
          positions[3 * pidx], positions[3 * pidx + 1], positions[3 * pidx + 2],
          colors[3 * pidx], colors[3 * pidx + 1], colors[3 * pidx + 2],
        ];
        data.colors = colors.subarray(3 * pidx, 3 * pidx + 3);
        if (filter(data)) { yield [pidx, data]; }
			}
    }
  }
  */
  
  function* mesh_entries(mesh, filter){
    var positions = mesh.geometry.getAttribute('position').array,
      colors = mesh.geometry.getAttribute('color').array,
      filter = filter || function(p){return true;},
      n = 3*mesh.n_el,
      data;
		for (var pidx = 0; pidx < n; pidx += 3) {
      data = [
        positions[pidx], positions[pidx + 1], positions[pidx + 2],
        colors[pidx], colors[pidx + 1], colors[pidx + 2],
      ];
      if (filter(data)) { yield [pidx, data]; }
		}
  }
  
  function get_plane_error_rate(it, params){
    var total_err = 0,
      cnt = 0,
      p0 = params.root,
      n = params.normal,
      p;
    for (var a of it){
      p = a[1];
      total_err += abs( n[0]*(p[0] - p0[0]) + n[1]*(p[1] - p0[1]) + n[2]*(p[2] - p0[2]) );
      cnt += 1;
    }
    return total_err / cnt;
  }
  
  function estimate_colors(it){
    var v, p,
      nClose = 0,
      xSum = 0,
      ySum = 0,
      zSum = 0,
      xxSum = 0,
      yySum = 0,
      zzSum = 0,
      xySum = 0,
      xzSum = 0,
      yzSum = 0;
    for (var a of it) {
      p = a[1];
      // Go to 0-255
      v = [
        p[3] * 255,
        p[4] * 255,
        p[5] * 255
      ];
      nClose += 1;
      xSum += v[0];
      ySum += v[1];
      zSum += v[2];
      //
      xxSum += pow(v[0], 2);
      yySum += pow(v[1], 2);
      zzSum += pow(v[2], 2);
      //
      xySum += v[0] * v[1];
      xzSum += v[0] * v[2];
      yzSum += v[2] * v[1];
    }
    
    // TODO: Add the standard deviation
    function divN(v){return v / (nClose + 1);}
    // diagonal entries
    var d = [
      xxSum - pow(xSum,2)/nClose,
      yySum - pow(ySum,2)/nClose,
      zzSum - pow(zSum,2)/nClose,
    ].map(divN);
    // off diagonals: xz, xy, zy
    var of = 1 / nClose,//2 / nClose + nClose,
      o = [
      xySum - of*xSum*ySum,
      xzSum - of*xSum*zSum,
      yzSum - of*ySum*zSum
    ].map(divN);
    var cov = [
      [d[0],o[0],o[1]],
      [o[0],d[1],o[2]],
      [o[1],o[2],d[2]]
    ];
    return {
      mean: [xSum, ySum, zSum].map(function(v,i){return v/nClose;}),
      cov: cov,
    }
    
  }

  function estimate_plane(it, root) {
    // Find all the points near it assuming upright
    var v, p,
      nClose = 0,
      xSum = 0,
      zSum = 0,
      ySum = 0,
      xxSum = 0,
      zzSum = 0,
      yySum = 0,
      xzSum = 0,
      xySum = 0,
      zySum = 0,
      points = [];
    for (var a of it){
      p = a[1];
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
      //
      points.push(p);
    }
    
    var A_plane_inv = numeric.inv([
      [zzSum, xzSum, zSum],
      [xzSum, xxSum, xSum],
      [zSum, xSum, nClose]
    ]);
    var sol_plane = numeric.dot(A_plane_inv, [zySum, xySum, ySum]);
    var normal = normalize([-sol_plane[0], -sol_plane[1], 1]);
    
    // TODO: Add the standard deviation
    function divN(v){return v / (nClose + 1);}
    // diagonal entries
    var d = [
      xxSum - pow(xSum,2)/nClose,
      zzSum - pow(zSum,2)/nClose,
      yySum - pow(ySum,2)/nClose
    ].map(divN);
    // off diagonals: xz, xy, zy
    var of = 1 / nClose,//2 / nClose + nClose,
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
      cov: cov,
      n: nClose,
      points: points,
    }

  }
  
  // (x - h)^2 + (y - k)^2 = r^2
  // a(x - x0) + b(y - y0) + c(z - z0) == 0
  // n = [a b c]
  function grow_plane(it, params){
    var c_cov = params.colors.cov,
      c_u = params.colors.mean,
      p0 = params.root,
      n = params.normal,
      plane_points = [],
      c_inv_cov = numeric.inv(c_cov),
      surf_thresh = 30,
      p;
    
    var c_prob = function(c){
      return -0.5*numeric.dotVV(numeric.dotVM(c, c_inv_cov), c);
    }
    var c_pr, err_r, cc = [0,0,0];
    for (var a of it){
      p = a[1];
      err_r = abs( n[0]*(p[0] - p0[0]) + n[1]*(p[1] - p0[1]) + n[2]*(p[2] - p0[2]) );
      if (err_r < surf_thresh) {
        cc[0] = 255 * p[3] - c_u[0];
        cc[1] = 255 * p[4] - c_u[1];
        cc[2] = 255 * p[5] - c_u[2];
        c_pr = c_prob(cc);
        if (c_pr > -12) { plane_points.push(p); }
      }
    }
    
    return plane_points;
  }
  
  // Estimate the grip using a vertical cyinder
  // y: up
  // x: left
  // z: forward
  function estimate_cylinder(it, root) {
    var v, p,
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
    for (var a of it){
      p = a[1];
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
      r: sqrt(4 * Ainv_bvec[2] + pow(Ainv_bvec[0], 2) + pow(Ainv_bvec[1], 2)) / 2 * 1e3,
      xc: Ainv_bvec[1] / 2 * 1000 + root[0],
      yc: root[1],
      zc: Ainv_bvec[0] / 2 * 1000 + root[2],
      root: root,
    };
  }

  // Grow a cylinder from a parameter set
  // (x - h)^2 + (y - k)^2 = r^2
  function grow_cylinder(it, params) {
    var p,
      sublevels = [],
      err_r,
      total_err = 0;
    
    // Find the valid sublevels based on how well the radius agrees
    // TODO: Use some probablity thing, maybe
    
    for (var a of it){
      p = a[1];
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
    params = estimate_cylinder(valid_cyl_points.entries(), params.root);
    params.h = p_upper[1] - p_lower[1];
    params.yc = (p_upper[1] + p_lower[1]) / 2;
    
    params.error = total_err;
    params.points = valid_cyl_points;
    
    return params;
  }
  
  // TODO: Tune the filters (for the generator)
  ctx.Estimate = {
    cylinder: function(mesh0, p0){
      var px = p0.x,
        py = p0.y,
        pz = p0.z,
        root = [px,py,pz],
        it = new mesh_entries(mesh0, function(vertex) {
          return abs(vertex[1] - py) < 30 && abs(vertex[0] - px) < 300 && abs(vertex[2] - pz) < 300;
        });
      var parameters = estimate_cylinder(it, root);
      //console.log(parameters);
      
      // Grow to update
      parameters = grow_cylinder(new mesh_entries(mesh0), parameters);
      parameters.id = 'cyl';
      //console.log(parameters);
      
      return parameters;
    },
    plane: function(mesh0, p0){
      var px = p0.x,
        py = p0.y,
        pz = p0.z,
        root = [px,py,pz],
        horizontal_it = new mesh_entries(mesh0, function(vertex) {
          return abs(vertex[1] - py) < 10 && abs(vertex[0] - px) < 60 && abs(vertex[2] - pz) < 60;
        }),
        vertical_it = new mesh_entries(mesh0, function(vertex) {
          return abs(vertex[1] - py) < 100 && abs(vertex[0] - px) < 50 && abs(vertex[2] - pz) < 50;
        });

      var horiz_params = estimate_plane(horizontal_it, root);
      horiz_params.id = 'h';
      //console.log('horiz', horiz_params);
      
      var vert_params = estimate_plane(vertical_it, root);
      vert_params.id = 'v';
      vert_params.normal[1] = 0;
      vert_params.normal = normalize(vert_params.normal);
      //console.log('vert', vert_params);
      
      var e_h = get_plane_error_rate(horiz_params.points.entries(), horiz_params),
        n_h = horiz_params.points.length;
      var e_v = get_plane_error_rate(vert_params.points.entries(), vert_params),
        n_v = vert_params.points.length;
      //console.log(e_h, e_v);

      // Choose if vertical or horizontal
      var params;
      if (e_h < e_v) {
        params = horiz_params;
      } else {
        params = vert_params;
      }
      
      // Run the colors
      params.colors = estimate_colors(params.points.entries());
      params.points = grow_plane(new mesh_entries(mesh0), params);
      
      // Update the roughness
      var p2 = estimate_plane(params.points.entries(), params.root);
      params.roughness = sqrt(numeric.eig(p2.cov).lambda.x[2]) * 1e3;
      // e_val = eigs.lambda.x[2] * 1e6, // 1e3 * 1e3, since covariance is a squared dependence
      // e_vec = [eigs.E.x[0][2],eigs.E.x[1][2],eigs.E.x[2][2]];
      
      return params;
    },
    classify: function(params) {
      // Learning and lassifiers here...
      // If ground...
      params.classifiers = [
        h_ground(params)
      ];
    },
    paint: function(params){
      if (h_ground(params)>9) {
        params.points.forEach(function(p){
          p.colors[0] = 0;
          p.colors[1] = 1;
          p.colors[2] = 0;
        });
      } else {
        params.points.forEach(function(p){
          p.colors[0] = 1;
          p.colors[1] = 1;
          p.colors[2] = 0;
        });
      }
    },
    find_poly: function(params){
      var root = params.root,
        norm2 = numeric.norm2,
        rhoDist = [],
        theta_idx,
        res = 10, // 10 degree chunks
        factor = (180/PI)/res,
        inv_factor = res*(PI/180),
        points = params.points.map(function(p){
          return [p[0] - root[0], p[1] - root[1], p[2] - root[2]];
        });
      // Sort in ascending radius
      points.forEach(function(p){ p[3] = norm2(p); });
      points.sort(function(p1, p2){ return p1[3] - p2[3]; });
      points.forEach(function(p){
        theta_idx = res + floor(0.5 + factor * atan2(p[0], p[2]));
        rhoDist[theta_idx] = p[3] - (rhoDist[theta_idx] || p[3]) < 100 ? p[3] : rhoDist[theta_idx];
      });
      return rhoDist.map(function(r, th){
        return [r*cos((th-res)*inv_factor), r*sin((th-res)*inv_factor)];
      });

    },
  }

}(this));