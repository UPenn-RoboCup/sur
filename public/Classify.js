(function (ctx) {
	'use strict';

  // Load the Matrix library
  //ctx.util.ljs('/js/numeric-1.2.6.min.js');

	var pow = Math.pow,
    abs = Math.abs,
    sqrt = Math.sqrt,
    exp = Math.exp,
    min = Math.min,
    PI = Math.PI,
		TWO_PI = 2*PI,
    atan = Math.atan,
    atan2 = Math.atan2,
    sin = Math.sin,
    cos = Math.cos,
    floor = Math.floor,
		ceil = Math.ceil;

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
	function dist(p1, p2){
		return sqrt(pow(p1[0] - p2[0], 2) + pow(p1[1] - p2[1], 2));
	}
	function angle(p1, p2){
		return atan2(p1[0]-p2[0], p1[1]-p2[1]);
	}
	function contains(p){
		// this is the polygon
		// p is the point to test
		var nChunks = this.rho.length,
			r = dist(this.center, p),
			a = angle(this.center, p),
			i = (a/PI+1)*(nChunks/2),
			i0 = floor(i),
			i1 = ceil(i),
			r0 = this.rho[i0] / 1000,
			r1 = this.rho[i1] / 1000;
		//console.log(i, r, r0, r1);
		// If less than both, it contains. This is liberal
		return r<r0 && r<r1;
	}

	// See which indicies to connect
	function match(poly0, poly1, ind0, ind1) {
		var my_arc = ind0.map(lookup, poly0.perimeter),
			their_arc = ind1.map(lookup, poly1.perimeter),
			in_poly1 = my_arc.map(contains, poly1),
			in_poly0 = their_arc.map(contains, poly0);

		var links = [];

		my_arc.forEach(function(p0, i0){
			if(in_poly1[i0]){links.push([poly1.center, p0]);}
		});
		their_arc.forEach(function(p1, i1){
			if(in_poly0[i1]){links.push([poly0.center, p1]);}
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
					links.push([p0, pguess]);
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
    get_poly_features: function(parameters) {
      console.log('Classify', parameters);
      var feat = pf.map(function(func){ return func(this); }, parameters);
      console.log('Features', feat);
      return feat;
    },
    poly_features: poly_features,
  };

}(this));
