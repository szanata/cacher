// general helpers!

/*
 * Extract filte name from url
 * than, normalizes the name to match windows OS restriction
 */
exports.getFileName = function (ref){
  return ref.match(/[^\/]*$/)[0].replace(/\?|\\|<|>|\:|\*|"/g,'');
}

/* 
 * given some url, ensures it have 'http' prefix 
 */
exports.qualifyUrl = function (url){
  return /^http:\/\/|^https:\/\//.test(url) ? url : ('http://' + url);
}

/*
 * return whether given url is absolute
 */
exports.isAbsoluteUrl = function (url){
  return /^http:\/\/|^https:\/\//.test(url);
}

/*
 * add cpp alike String.format function tpo js
 */
if (!String.format){
  String.format = function(){
    for (var i = 0, args = arguments; i < args.length - 1; i++)
      args[0] = args[0].replace(RegExp("\\{" + i + "\\}", "gm"), args[i + 1]);
    return args[0];
  };
}
if (!String.prototype.format && String.format) {
  String.prototype.format = function(){
    var args = Array.prototype.slice.call(arguments).reverse();
    args.push(this);
    return String.format.apply(this, args.reverse());
  }; 
}