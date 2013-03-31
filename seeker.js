/*
* this module handles the http request to external resources
*/
var 
  request = require('request'),
  fs = require('fs'),
  headers = {
    'Connection':'keep-alive',
    'Cache-Control':'no-cache',
    'Pragma':'no-cache',
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22'
  }; 

/*
 * request the page content
 */
exports.requestData = function (url, callback){
  ws.send(JSON.stringify({type:'status',msg:'Fetching from ' + url}));
  var req = request({
    uri: url,
    headers: headers
  }); 
  req.on('error', function (err){
    ws.send(JSON.stringify({type:'error',msg:'Error ' + err}));
  });
  req.on('response', function (res){
    var 
      content = '',
      len = parseInt(res.headers['content-length'], 10),
      total = 0;

    res.on('data', function (chunk){
      content += chunk;
      total += (chunk.length / len) * 100;
      ws.send(JSON.stringify({type:'progress',msg:Math.round(total) + '%'}));
    });
    
    res.on('end', function (){
      callback(content);
    });
  });
}
  
/*
 * saves given file by its ref with given filename
 * also updates new saved file with its last modified date 
 */
exports.saveFile = function (ref, filename){
  var req = request.get({uri: ref,headers: headers});
  req.on('response', function (res) {
    var downloadfile = fs.createWriteStream(filename, {'flags': 'w'});
    res.on('data', function (chunk) {
      downloadfile.write(chunk, encoding='binary');
    });
    res.on('end', function() {
      downloadfile.end();
      var date = res.headers['last-modified'] ? new Date(res.headers['last-modified']) : new Date()
      try{
        fs.utimes(filename, new Date(), date);
      }catch (e){}
    });
  });
};

/* get last modified date for some file*/
exports.getLastModifiedDate = function (ref,callback){
  var options = {
    uri: ref,
    method: 'HEAD',
    headers: {'Connection': 'keep-alive'}
  }
  var req = request(options, function (err,res){
    callback((!err && res.headers['last-modified']) ? res.headers['last-modified'] : null);
  });
}