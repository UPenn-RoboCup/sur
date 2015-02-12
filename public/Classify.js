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
	function smaller(m, cur){ return m < cur ? m : cur; }
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

	function get_wrapped_indices(start, stop, max){
		var indices = [], i = start;
		while (i != stop) {
			indices.push(i);
			i += 1;
			i = (i==max) ? 0 : i;
		}
		indices.push(i);
		return indices;
	}

	// Find the indices to check for breakage for this poly
	// This can be thorough or not.
	// Yes: all points
	// No: Just the closest one
	function cone(e){
		var nChunks = this.rho.length,
			a0 = angle(this.center, e.a),
			a1 = angle(this.center, e.b),
			a0i = min(round(angle_idx(a0, nChunks)), nChunks-1),
			a1i = min(round(angle_idx(a1, nChunks)), nChunks-1),
			is_inverted = a0i > a1i,
			is_obtuse = abs(a1i - a0i) > nChunks/2,
			indices_to_check;
		if (is_obtuse) {
			if (is_inverted) {
				indices_to_check = get_wrapped_indices(a0i, a1i, nChunks);
			} else {
				indices_to_check = get_wrapped_indices(a1i, a0i, nChunks);
			}
		} else {
			if (is_inverted) {
				indices_to_check = get_wrapped_indices(a1i, a0i, nChunks);
			} else {
				indices_to_check = get_wrapped_indices(a0i, a1i, nChunks);
			}
		}
		//console.log(a0i, a1i, indices_to_check, nChunks, is_obtuse, is_inverted);
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
	function breaks(e){
		// See if the endpoints are inside our poly
		if (contains.call(this, e.a)){
			return true;
		} else if (contains.call(this, e.b)) {
			return true;
		}
		//console.log(this);
		var br_cone = cone.call(this, e);
		var a_dist = dist.call(this.center, e.a);
		var b_dist = dist.call(this.center, e.b);
		var cone_rho = br_cone.map(lookup, this.rho);
		var does_break = cone_rho.map(function(d){
			return min(a_dist-d, b_dist-d) < 0;
		}).reduce(function(prev, now){return prev||now;});
		if(does_break){ return true; }
		// TODO: Add distnace from point to line
		// http://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
		return false;
	}

	// See which indicies to connect
	function match(poly0, poly1, ind0, ind1) {
		var my_arc = ind0.map(lookup, poly0.perimeter),
			their_arc = ind1.map(lookup, poly1.perimeter),
			in_poly1 = my_arc.map(contains, poly1),
			in_poly0 = their_arc.map(contains, poly0);

		var links = [];

		my_arc.forEach(function(p0, i0){
			if(in_poly1[i0]){
				links.push({
					a: poly1.center,
					b: p0,
					poly_a: poly1,
					poly_b: poly0,
					ind_a: -1, // center
					ind_b: i0
				});
			}
		});
		their_arc.forEach(function(p1, i1){
			if(in_poly0[i1]){
				links.push({
					a: poly0.center,
					b: p1,
					poly_a: poly0,
					poly_b: poly1,
					ind_a: -1, // center
					ind_b: i1
				});
			}
		});

		// TODO: Assume the order of the indices in the arcs is increasing?
		// NOTE: I think endpoint to endpoint order is valid...
		// Check each pair
		my_arc.forEach(function(p0, i0){
			// If point not already in the other poly
			if (!in_poly1[i0]) {
				var iguess = their_arc.length-1-i0;
				if(!in_poly0[iguess]){
					var pguess = their_arc[iguess];
					links.push({
						a: pguess,
						b: p0,
						poly_a: poly1,
						poly_b: poly0,
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

		return {
			arc0: my_arc,
			arc1: their_arc,
			in1: in_poly1,
			in0: in_poly0,
			links: links,
		};

/*
		ind0.map(lookup, poly0.perimeter).forEach(function(p0){
			ind1.map(lookup, poly1.perimeter).forEach(function(p1){

			});
		});
*/
	}

  // Hold all the classifiers
  var classifiers = {
    ground: function(p){
      // Larger it is, then more ground-y it is
      return numeric.dotVV(p.normal, [0,1,0]) * (1 + 1/abs(p.root[1]/1000));
    },
    inscribedCircle: function(p){
      // Just the smallest radius. Technically not correct, but OK for now
      return p.poly.rhoDist.reduce(smaller);
    },

  };
  // Order of the features
  var poly_features = [
    'ground', 'inscribedCircle',
  ];
  // Quickly compute the features from the functions in the correct order
  var pf = poly_features.map(function(n){ return this[n]; }, classifiers);

  ctx.Classify = {
		match: match,
		breaks: breaks,
    get_poly_features: function(parameters) {
      console.log('Classify', parameters);
      var feat = pf.map(function(func){ return func(this); }, parameters);
      console.log('Features', feat);
      return feat;
    },
    poly_features: poly_features,
  };

}(this));
