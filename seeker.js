

exports.getRefs = function getRefs(content){
  console.log(content.match(/href\=".[^"]"/));
}