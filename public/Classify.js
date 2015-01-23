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
  
  ctx.Classify = {
    classify: function(params) {
      // Learning and lassifiers here...
      // If ground...
      params.classifiers = [
        h_ground(params)
      ];
    },
  }

}(this));