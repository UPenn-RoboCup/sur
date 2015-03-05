(function (ctx) {
	'use strict';

	var numeric = ctx.numeric,
		mf = ctx.util.mapFuncs,
		dist = mf.dist;

  // Load the Matrix library
  //ctx.util.ljs('/js/numeric-1.2.6.min.js');

	var abs = Math.abs,
    min = Math.min,
    PI = Math.PI,
		round = Math.round;

	// Requires: stop>=start
	function get_wrapped_indices(start, stop, max){
		var indices = [], i, v;
		for (i=start; i <= stop; i+=1) {
			if (i<0){
				indices.push(i + max);
			} else if (i >= max) {
				indices.push(i - max);
			} else {
				indices.push(i);
			}
		}
		return indices;
	}

	// Find the indices to check for breakage for this poly
	// This can be thorough or not.
	// Yes: all points
	// No: Just the closest one
	function cone(e){
		var nChunks = this.rho.length,
			a0 = angle.call(this.center, e[0]),
			a1 = angle.call(this.center, e[1]),
			a0i = min(round(angle_idx(a0, nChunks)), nChunks-1),
			a1i = min(round(angle_idx(a1, nChunks)), nChunks-1),
			is_inverted = a0i > a1i,
			is_obtuse = abs(a1i - a0i) > nChunks/2,
			i0, i1, indices_to_check;
		if (is_obtuse) {
			if (is_inverted) {
				i0 = a0i;
				i1 = a1i + nChunks;
			} else {
				i0 = a1i;
				i1 = a0i + nChunks;
			}
		} else {
			if (is_inverted) {
				i0 = a1i;
				i1 = a0i;
			} else {
				i0 = a0i;
				i1 = a1i;
			}
		}
		indices_to_check = get_wrapped_indices(i0, i1, nChunks);
		//console.log(a0i, a1i, indices_to_check, i0, i1, nChunks, is_obtuse, is_inverted);
		return indices_to_check;
	}


	// Check if this this poly breaks edge e (a, b)
	function breaks(a, b){
		var nChunks = this.rho.length;
		// See if the endpoints are inside our poly
		if (contains.call(this, a)){
			return true;
		} else if (contains.call(this, b)) {
			return true;
		}

		// c is the closest point along (a,b) to this
		/*
		var a_dist = dist.call(this.center, a);
		angle.call(this, b);
		*/
		var crossDist = mf.dist2line.call(this.center, a, b),
			angA = angle.call(this.center, a),
			angB = angle.call(this.center, b),
			dAng = angB - angA;

		var a2center = numeric.sub(this.center, a),
			a2b = numeric.sub(this.center, b),
			angBC = abs(angle.call(a2center, a2b)),
			angThis = angA - (PI/2 - angBC),
			iAngThis = round(angle_idx(angThis, nChunks)),
			r = this.rho[iAngThis],
			dAngThis = angThis - angA;

		if (crossDist < r){
			if(dAng>1.7*PI){dAng=2*PI-dAng;}
			if(abs(dAngThis)<abs(dAng)){
				/*
			console.log('angBC',angBC*180/PI);
			console.log('angThis',angThis*180/PI);
			console.log('angA',angA*180/PI);
			console.log('angB',angB*180/PI);
			console.log('r', r);
			console.log('crossDist', crossDist);
			console.log('dAng', dAng*180/PI, dAngThis*180/PI);
			console.log('\n');
			*/
				return true;
			}
		}

/*
		var br_cone = cone.call(poly, [a,b]);
		var a_dist = dist.call(poly.center, a);
		var b_dist = dist.call(poly.center, b);
		var cone_rho = br_cone.map(mf.lookup, poly.rho);
		var does_break = cone_rho.map(function(d){
			return min(a_dist-d, b_dist-d) < 0;
		}).reduce(function(prev, now){return prev||now;});
		if(does_break){ return true; }
*/
		return false;
	}
	
		// If this poly contains point p
	function contains(p){
		// this is the polygon
		// p is the point to test
		var nChunks = this.rho.length,
			rp = dist.call(this.center, p),
			a = angle.call(this.center, p),
			i = round(angle_idx(a, nChunks)),
			r = this.rho[i];

		if(rp<r){
//			console.log('\nContains this', this.center, 'point', p);
//			console.log('diff', numeric.sub(p, this.center), rp);
//			console.log('Degrees', a*180/PI, i, r);
			return true;
		}

		// If less than both, it contains. This is liberal
		//return rp<r;
		return false;
	}

	// See which indicies to connect
	function match(polys, ipoly0, ipoly1, ind0, ind1) {
		var poly0 = polys[ipoly0],
			poly1 = polys[ipoly1];
		return ind0.map(function(i0, ii){
			var p0 = poly0.perimeter[i0],
				i1 = ind1[ii],
				p1 = poly0.perimeter[i1[ii]];
			if(contains.call(poly1, p0)){ i1 = -1; }
			return {
				poly_a: ipoly0,
				poly_b: ipoly1,
				ind_a: i0,
				ind_b: i1,
			};
		});
	}

	// this: poly to compare against
	function halfplanes(poly){
		var nChunks = this.rho.length,
			a = angle.call(this.center, poly.center),
			i = round(angle_idx(a, nChunks)),
			my_indices = get_wrapped_indices(i-nChunks/4, i+nChunks/4, nChunks),
			their_indices = get_wrapped_indices(i+nChunks/4, i+3*nChunks/4, nChunks).reverse();

			var n = 3;
			my_indices = get_wrapped_indices(i-n, i+n, nChunks);
			their_indices = get_wrapped_indices(i+nChunks/2-n, i+nChunks/2+n, nChunks).reverse();
/*
		console.log('this', this.center, 'poly', poly.center);
		console.log('Diff', numeric.sub(poly.center,this.center))
		console.log('Degrees:',a*180/PI, 'Index', i);
		console.log('this Indices', my_indices);
		console.log('poly Indices', their_indices);
*/

		return [my_indices, their_indices];
		//return [[i], [(i>nChunks/2) ? (i+nChunks/2):(i-nChunks/2)]];
	}

	// Trail entries: [x, y, dist, all_points index]
	// all_points entries: [x, y, poly index, perimeter index]
	function add_true_path(trail, all_points, polys){
		//console.log('add_true_path', trail, all_points, polys);
		// Find the points in the polys
		var features = trail.map(function(t){
			var ap = all_points[t[3]],
				poly = polys[ap[2]];
			if(ap[3]===-1){return get_pf(poly.parameters);}
			return get_ppf({ p: poly.perimeter[ap[3]], poly: poly, idx: ap[3] });
		});
		console.log('True Features', features);
	}

  // Hold all the classifiers
  var poly_classifiers = {
    ground: function(p){
      // Larger it is, then more ground-y it is
      return numeric.dotVV(p.normal, [0,1,0]) * (1 + 1/abs(p.root[1]/1e3));
    },
    inscribedCircle: function(p){
      // Just the smallest radius. Technically not correct, but OK for now
      return p.poly.rhoDist.reduce(min);
    },
		roughness: function(p){
			return p.roughness;
		},
  };
  // Order of the features
  var poly_features = [
    'ground', 'inscribedCircle', 'roughness'
  ];
  // Quickly compute the features from the functions in the correct order
  var pf = poly_features.map(mf.lookup, poly_classifiers);
	function get_pf(parameters) { return pf.map(apply, parameters); }

	// Hold all the classifiers
	// Just the reduced poly?
	var perim_classifiers = {
		neighbor: function(obj){
			var p = obj.p, poly = obj.poly, i = obj.idx;
			return get_wrapped_indices(i-1, i+1, poly.rho.length)
				.map(mf.lookup, poly.rho)
				.map(function(pn){ return abs(pn - this); }, poly.rho[i])
				.reduce(Math.max, 0);
		}
	};
	// Order of the features
	var perim_features = [
		'neighbor'
	];
	// Quickly compute the features from the functions in the correct order
	var ppf = perim_features.map(mf.lookup, perim_classifiers);
	function get_ppf(parameters) { return ppf.map(apply, parameters); }

	// Edge classification
	var edge_classifiers = {
		elevation: function(obj){
			return 0;
		},
		dist2obstacle: function(obj){
			return 0;
		},
	};
	// Order of the features
	var edge_features = [
		'elevation'
	];
	// Quickly compute the features from the functions in the correct order
	var ef = edge_features.map(mf.lookup, edge_classifiers);
	function get_ef(parameters) { return ef.map(apply, parameters); }


	// Export
  ctx.Classify = {
		match: match,
		breaks: breaks,
    get_poly_features: get_pf,
    poly_features: poly_features,
		halfplanes: halfplanes,
		add_true_path: add_true_path,
  };

}(this));
