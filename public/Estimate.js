(function (ctx) {
	'use strict';

	var mf = ctx.util.mapFuncs,
		numeric = ctx.numeric,
		abs = Math.abs,
		pow = Math.pow,
    sqrt = Math.sqrt,
    atan2 = Math.atan2;

  /*
  function* face_entries(mesh, filter){
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

  function* Point_cloud_entries(mesh, filter){
    var positions = mesh.geometry.getAttribute('position').array,
      colors = mesh.geometry.getAttribute('color').array,
      n = 3 * mesh.n_el,
      data;
		for (var pidx = 0; pidx < n; pidx += 3) {
      data = [
        positions[pidx], positions[pidx + 1], positions[pidx + 2],
        colors[pidx], colors[pidx + 1], colors[pidx + 2],
      ];
      if (typeof filter !== 'function' || filter(data)) { yield [pidx, data]; }
		}
  }

  function get_plane_error(it, params){
    var total_err = 0, err,
			n_big_err = 0,
      cnt = 0,
      p0 = params.root,
      n = params.normal,
      p;
    for (var a of it){
      p = a[1];
			err = abs(
				n[0]*(p[0] - p0[0]) + n[1]*(p[1] - p0[1]) + n[2]*(p[2] - p0[2])
			);
			if(err>15){ n_big_err += 1; }
      total_err += err;
      cnt += 1;
    }
    return {
			error_rate: total_err / cnt,
			big_error_ratio: n_big_err / cnt,
			n_points: cnt
		};
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
      yzSum = 0,
			c_episilon = 0.1;
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

    // diagonal entries
    var d = numeric.div([
      xxSum - pow(xSum,2)/nClose + c_episilon,
      yySum - pow(ySum,2)/nClose + c_episilon,
      zzSum - pow(zSum,2)/nClose + c_episilon,
    ], nClose + 1);
    // off diagonals: xz, xy, zy
    var of = 1 / nClose,//2 / nClose + nClose,
      o = numeric.div([
      xySum - of*xSum*ySum,
      xzSum - of*xSum*zSum,
      yzSum - of*ySum*zSum
    ], nClose + 1);
    var cov = [
      [d[0],o[0],o[1]],
      [o[0],d[1],o[2]],
      [o[1],o[2],d[2]]
    ];
    return {
      mean: numeric.div([xSum, ySum, zSum], nClose),
      cov: cov,
    };

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

		var A_plane = [
      [zzSum, xzSum, zSum],
      [xzSum, xxSum, xSum],
      [zSum, xSum, nClose]
    ];
		//console.log(A_plane);

    var A_plane_inv = numeric.inv(A_plane);
    var sol_plane = numeric.dot(A_plane_inv, [zySum, xySum, ySum]);
    var normal0 = [-sol_plane[0], -sol_plane[1], 1];
		var normal = numeric.div(normal0, numeric.norm2(normal0));

    // TODO: Add the standard deviation
    // diagonal entries
    var d = numeric.div([
      xxSum - pow(xSum,2)/nClose,
      zzSum - pow(zSum,2)/nClose,
      yySum - pow(ySum,2)/nClose
    ], nClose + 1);
    // off diagonals: xz, xy, zy
    var of = 1 / nClose,//2 / nClose + nClose,
      o = numeric.div([
      xzSum - of*xSum*zSum,
      xySum - of*xSum*ySum,
      zySum - of*zSum*ySum
    ], nClose + 1);
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
    };
  }

  // zero mean assumed for color probability
  var dotVV = numeric.dotVV, dotVM = numeric.dotVM;
  function c_prob(c, icov){
    return -0.5*dotVV(dotVM(c, icov), c);
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
    var c_pr, err_r, cc = [0,0,0];
    for (var a of it){
      p = a[1];
      err_r = abs( n[0]*(p[0] - p0[0]) + n[1]*(p[1] - p0[1]) + n[2]*(p[2] - p0[2]) );
      if (err_r < surf_thresh) {
        cc[0] = 255 * p[3] - c_u[0];
        cc[1] = 255 * p[4] - c_u[1];
        cc[2] = 255 * p[5] - c_u[2];
        c_pr = c_prob(cc, c_inv_cov);
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

	function get_cyl_rates(it, params){
		var p, n_tot=0, n_in=0, n_on = 0, err_r, dx, dz, ang, angles = [], nA = 10, r_close = params.r/10;
		for(var i = 0; i<nA; i+=1){angles[i]=0;}
		for (var a of it){
			p = a[1];
			dx = p[0] - params.xc;
			dz = p[2] - params.zc;
			err_r = params.r - sqrt(pow(dx, 2) +  pow(dz, 2));
			if (err_r > r_close) { n_in += 1; }
			if (abs(err_r)<=r_close){ n_on += 1; }
			ang = mf.iangle.call(nA, atan2(dz, dx));
			angles[ang] = 1;
			n_tot += 1;
		}
		//console.log(n_in, n_tot, n_in / n_tot, angle_ratio, angles);
		return {
			fill_rate: n_in / n_tot,
			angle_rate: angles.reduce(function(prev, now){return prev+now;}) / nA,
			on_rate: n_on / n_tot,
			on_in_ratio: n_on / n_in,
		};
	}

  // Grow a cylinder from a parameter set
  // (x - h)^2 + (y - k)^2 = r^2
  function grow_cylinder(it, params) {
    var p,
      sublevels = [],
      err_r,
      total_err = 0,
			r_close = params.r/12;

    // Find the valid sublevels based on how well the radius agrees
    // TODO: Use some probablity thing, maybe

    for (var a of it){
      p = a[1];
      err_r = abs(sqrt(pow(p[0] - params.xc, 2) +  pow(p[2] - params.zc, 2)) - params.r);
      if (err_r < r_close) {
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
      p_last;
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
    var valid_cyl_points = goodlevels.filter(function(value, index){
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
        it = new Point_cloud_entries(mesh0, function(vertex) {
          return abs(vertex[1] - py) < 30 && abs(vertex[0] - px) < 300 && abs(vertex[2] - pz) < 300;
        });
      var params = estimate_cylinder(it, root);
			if (params.r > 500 || params.r < 40) {
				//console.log('Bad Cyl Radius Rate', params);
				return false;
			}
			// Check the fill - an estimate of the error.
			var rates = get_cyl_rates(new Point_cloud_entries(mesh0, function(vertex) {
				return abs(vertex[1] - py) < 30 && sqrt(pow(vertex[0] - params.xc, 2) +  pow(vertex[2] - params.zc, 2)) <= params.r;
			}), params);

			if (rates.fill_rate > 0.20) {
				//console.log('Bad Cyl Fill Rate', rates);
				return false;
			} else if (rates.angle_rate <= 0.3) {
				//console.log('Bad Cyl Angle Rate', rates);
				return false;
			}

      // Grow to update
			params = grow_cylinder(new Point_cloud_entries(mesh0), params);
			params.id = 'cyl';

			console.log('Cylinder', params, rates);

      return params;
    },
    plane: function(mesh0, p0){
      var px = p0.x,
        py = p0.y,
        pz = p0.z,
        root = [px,py,pz],
        horizontal_it = new Point_cloud_entries(mesh0, function(vertex) {
          return abs(vertex[1] - py) < 10 && abs(vertex[0] - px) < 60 && abs(vertex[2] - pz) < 60;
        }),
        vertical_it = new Point_cloud_entries(mesh0, function(vertex) {
          return abs(vertex[1] - py) < 100 && abs(vertex[0] - px) < 50 && abs(vertex[2] - pz) < 50;
        });

      var horiz_params = estimate_plane(horizontal_it, root);
      horiz_params.id = 'h';

      var vert_params = estimate_plane(vertical_it, root);
      vert_params.id = 'v';
      vert_params.normal[1] = 0;
      vert_params.normal = numeric.div(
				vert_params.normal,
				numeric.norm2(vert_params.normal)
			);

			// Choose if vertical or horizontal
      var e_h = get_plane_error(horiz_params.points.entries(), horiz_params),
      	e_v = get_plane_error(vert_params.points.entries(), vert_params);

			var params;
			if(e_h.n_points<25 && e_v.n_points<25){
				params = null;
			} else if(e_v.n_points>3*e_h.n_points){
				params = vert_params;
			} else if(e_v.big_error_ratio>0.25){
				params = horiz_params;
			}

			//console.log('H Error', e_h, horiz_params);
			//console.log('V Error', e_v, vert_params);
			if(!params){return false;}

      // Run the colors
      params.colors = estimate_colors(params.points.entries());
			//console.log('Colors w/ params', params);
      params.points = grow_plane(new Point_cloud_entries(mesh0), params);

      // Update the roughness
      var p2 = estimate_plane(params.points.entries(), params.root);
      params.roughness = sqrt(numeric.eig(p2.cov).lambda.x[2]) * 1e3;
      // e_val = eigs.lambda.x[2] * 1e6, // 1e3 * 1e3, since covariance is a squared dependence
      // e_vec = [eigs.E.x[0][2],eigs.E.x[1][2],eigs.E.x[2][2]];

			console.log(params.id + ' Plane', params);

      return params;
    },
    find_poly: function(points0){
      var points0R = points0.map(function(p){
				var nm0 = sqrt(p.reduce(function(cur, now){ return cur + pow(now, 2); }, 0));
				return p.concat(nm0);
			});
			// Sort in ascending radius
			// TODO: Descending, can exit when all are populated
      points0R.sort(function(p1, p2){ return p1[3] - p2[3]; });

			var perim = [], nChunks = 20;
			for (var i=0; i < nChunks; i+=1) { perim[i] = null; }

			var rhoThreshold = 50, maxRho = 500;
			points0R.forEach(function(p){
				var angle = atan2(p[0], p[2]),
					idx = mf.iangle_valid.call(nChunks, angle);
				if (!perim[idx]) {
					perim[idx] = p;
					return;
				}
				if(perim[idx][3] > maxRho) { return; }
				if(p[3] - perim[idx][3] > rhoThreshold){ return; }
				perim[idx] = p;
      });
      return perim;
    },
  };

}(this));
