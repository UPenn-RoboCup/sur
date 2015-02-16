(function (ctx) {
	'use strict';

  // Load the Matrix library
  //ctx.util.ljs('/js/numeric-1.2.6.min.js');

	var pow = Math.pow,
    abs = Math.abs,
    sqrt = Math.sqrt,
    exp = Math.exp,
    min = Math.min,
		max = Math.max,
    PI = Math.PI,
		TWO_PI = 2*PI,
    atan = Math.atan,
    atan2 = Math.atan2,
    sin = Math.sin,
    cos = Math.cos,
    floor = Math.floor,
		ceil = Math.ceil,
		round = Math.round;

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

	function lookup(i) { return this[i]; }
	function apply(func){ return func(this); }
	function smaller(m, cur){ return m < cur ? m : cur; }
	function larger(m, cur){ return m > cur ? m : cur; }
	// dist between this and a point
	function dist(p){
		return sqrt(pow(this[0] - p[0], 2) + pow(this[1] - p[1], 2));
	}
	function angle(p1, p2){
		return atan2(p1[0]-p2[0], p1[1]-p2[1]);
	}
	function angle_idx(a, nChunks){
		return (a/PI+1)*(nChunks/2);
	}

	// Requires: stop>=start
	function get_wrapped_indices(start, stop, max){
		var indices = [], i, v;
		for (i=start; i <= stop; i+=1) {
			if (i<0)         { indices.push(i + max); }
			else if (i>=max) { indices.push(i - max); }
			else             { indices.push(i); }
		}
		return indices;
	}

	// Find the indices to check for breakage for this poly
	// This can be thorough or not.
	// Yes: all points
	// No: Just the closest one
	function cone(e){
		var nChunks = this.rho.length,
			a0 = angle(this.center, e[0]),
			a1 = angle(this.center, e[1]),
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

	// If this poly contains point p
	function contains(p){
		// this is the polygon
		// p is the point to test
		var nChunks = this.rho.length,
			r = dist.call(this.center, p),
			a = angle(this.center, p),
			i = angle_idx(a, nChunks),
			i0 = floor(i),
			i1 = ceil(i),
			r0 = this.rho[i0],
			r1 = this.rho[i1];
		//console.log(i, r, r0, r1);
		// If less than both, it contains. This is liberal
		return r<r0 && r<r1;
	}
	// Check if this poly breaks edge e
	function breaks(poly, a, b){
		// See if the endpoints are inside our poly
		if (contains.call(poly, a)){
			return true;
		} else if (contains.call(poly, b)) {
			return true;
		}
		//console.log(this);
		var br_cone = cone.call(poly, [a,b]);
		var a_dist = dist.call(poly.center, a);
		var b_dist = dist.call(poly.center, b);
		var cone_rho = br_cone.map(lookup, poly.rho);
		var does_break = cone_rho.map(function(d){
			return min(a_dist-d, b_dist-d) < 0;
		}).reduce(function(prev, now){return prev||now;});
		if(does_break){ return true; }
		// TODO: Add distnace from point to line
		// http://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
		return false;
	}

	// See which indicies to connect
	function match(polys, ipoly0, ipoly1, ind0, ind1) {
		var poly0 = polys[ipoly0], poly1 = polys[ipoly1], links = [];
		if (ipoly0===ipoly1){ return links; }

		ind0.forEach(function(i){
			var p = poly0.perimeter[i];
			if(contains.call(poly1, p)){
				links.push({
					poly_a: ipoly1,
					poly_b: ipoly0,
					ind_a: -1, // center
					ind_b: i
				});
			}
		});
		ind1.forEach(function(i){
			var p = poly1.perimeter[i];
			if(contains.call(poly0, p)){
				links.push({
					poly_a: ipoly0,
					poly_b: ipoly1,
					ind_a: -1, // center
					ind_b: i
				});
			}
		});

		// TODO: Assume the order of the indices in the arcs is increasing?
		// NOTE: I think endpoint to endpoint order is valid...
		// Check each pair
		ind0.forEach(function(i0, ii){
			var p0 = poly0.perimeter[i0],
				p0inPoly1 = contains.call(poly1, p0);
			// If point not already in the other poly
			if (!p0inPoly1) {
				var iguess = ind1.length-1-ii,
					pguess = poly1.perimeter[iguess],
					pGuessinPoly0 = contains.call(poly0, pguess);
				if(!pGuessinPoly0){
					links.push({
						poly_a: ipoly1,
						poly_b: ipoly0,
						ind_a: iguess,
						ind_b: i0,
					});
				}
				// Below is more thorough;
				/*
				their_arc.forEach(function(p1, i1){
					if (!in_poly0[i1]) {
						var entire = dist(p0, p1),
							guess = dist(p0, pguess);
						if(1.2*entire < guess){
							console.log(i0, 'oops', guess, entire, iguess, i1);
						}
					}
				});
				*/
			}
		});

		return links;

/*
		ind0.map(lookup, poly0.perimeter).forEach(function(p0){
			ind1.map(lookup, poly1.perimeter).forEach(function(p1){

			});
		});
*/
	}

	// this: poly to compare against
	function halfplanes(poly){
		var nChunks = this.rho.length,
			a = angle(this.center, poly.center),
			i = round(angle_idx(a, nChunks)),
			my_indices = get_wrapped_indices(i-nChunks/4, i+nChunks/4, nChunks),
			their_indices = get_wrapped_indices(i+nChunks/4, i+3*nChunks/4, nChunks);
		return [my_indices, their_indices];
	}

	function add_true_path(path, polys){
		console.log('Path', path, polys);
		// Find the points in the polys
		var features = path.map(function(p){
			for(var i=0; i<polys.length; i+=1 ){
				var poly = polys[i], pc = poly.center, pp;
				if(pc[0]==p[0] && pc[1]==p[1]){
					return get_pf(poly.parameters);
				}
				for(var j=0, per = poly.perimeter; j<per.length; j+=1 ){
					pp = per[j];
					if(pp[0]==p[0] && pp[1]==p[1]){
						return get_ppf({ p: pp, poly: poly, idx: j });
					}
				}
			}
		});
		console.log(features);
	}

  // Hold all the classifiers
  var poly_classifiers = {
    ground: function(p){
      // Larger it is, then more ground-y it is
      return numeric.dotVV(p.normal, [0,1,0]) * (1 + 1/abs(p.root[1]/1e3));
    },
    inscribedCircle: function(p){
      // Just the smallest radius. Technically not correct, but OK for now
      return p.poly.rhoDist.reduce(smaller);
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
  var pf = poly_features.map(lookup, poly_classifiers);
	function get_pf(parameters) { return pf.map(apply, parameters); }

	// Hold all the classifiers
	// Just the reduced poly?
	var perim_classifiers = {
		neighbor: function(obj){
			var p = obj.p, poly = obj.poly, i = obj.idx;
			return get_wrapped_indices(i-1, i+1, poly.rho.length)
				.map(lookup, poly.rho)
				.map(function(pn){ return abs(pn - this); }, poly.rho[i])
				.reduce(larger, 0);
		}
	};
	// Order of the features
	var perim_features = [
		'neighbor'
	];
	// Quickly compute the features from the functions in the correct order
	var ppf = perim_features.map(lookup, perim_classifiers);
	function get_ppf(parameters) { return ppf.map(apply, parameters); }

	// Edge classification
	var edge_classifiers = {
		elevation: function(obj){
			return 0;
		},
	};
	// Order of the features
	var edge_features = [
		'elevation'
	];
	// Quickly compute the features from the functions in the correct order
	var ef = edge_features.map(lookup, edge_classifiers);
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
