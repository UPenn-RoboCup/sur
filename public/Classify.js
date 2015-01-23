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
    
  function smaller(m, cur){ return m < cur ? m : cur; }
  
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
    
  }
  // Order of the features
  var poly_features = [
    'ground', 'inscribedCircle', 
  ];
  // Quickly compute the features from the functions in the correct order
  var pf = poly_features.map(function(n){ return this[n]; }, classifiers);
  
  ctx.Classify = {
    get_poly_features: function(parameters) {
      console.log('Classify', parameters);
      var feat = pf.map(function(func){ return func(this); }, parameters);
      console.log('Features', feat);
      return feat;
    },
    poly_features: poly_features,
  }

}(this));