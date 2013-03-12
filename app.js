
var request = require("request"),
  fs = require('fs'),
  path = require('path'),
  express = require('express'),
  app = express(),
  assetManager = require('connect-assetmanager'),
  WebSocketServer = require('ws').Server,
  wss = new WebSocketServer({port: 8090});

var assetManagerGroups = {
  'css': {
    'route': /\/static\/style\.css/,
    'path': __dirname + '/public/styles/',
    'dataType': 'css',
    'files': [ 'sexy.css' ]
  },
  'js': {
    'route': /\/static\/script\.js/,
    'path': __dirname + '/public/scripts/',
    'dataType': 'javascript',
    'files': [ 'jquery-1.9.1.min.js', 'cacher.js' ]
  }
};
  
wss.on('connection', function (ws) {
 
  global.ws = ws;
  ws.on('message', function (raw) {
    var data = JSON.parse(raw);
    switch (data.type){
      case 'set-url':
        var url = qualifyUrl(data.val);
        requestData(url, function (content){
          ws.send(JSON.stringify({type:'extract-refs',val:content}));
        });
        break;
      case 'refs':
        ws.send(JSON.stringify({type:'status',msg:'Starting file storage...'}));
        processRefs(data.val);
    }
  });
  ws.send(JSON.stringify({type:'start',msg:'Yeah! We\'re online!'}));
});



app.configure(function (){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  // minify + combine
  app.use(assetManager(assetManagerGroups)); 
  // compress + cache
  app.use(express.compress());
  app.use(express.static(__dirname + '/public', {maxAge: 86400000}));
  app.use(app.router);
  fs.mkdir(__dirname + '/_cache');
  fs.mkdir(__dirname + '/_temp');
});

app.get('/', function (req,res){
  res.render('index');
});

app.listen(process.env.PORT || 8088);

function qualifyUrl(url){
  if (!/$http:\/\/|$https:\/\//.test(url)){
    return 'http://' + url;
  }
  return url;
}

function requestData(url, callback){
  ws.send(JSON.stringify({type:'status',msg:'Fetching from ' + url}));
  var req = request.get({
    uri: url,
    headers: {'Connection': 'keep-alive'}
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

function getLastModifiedDate(link,callback){
  var options = {
    uri: link,
    method: 'HEAD',
    headers: {'Connection': 'keep-alive'}
  }
  var req = request(options, function (error,res){
    callback(res.headers['last-modified'] ? res.headers['last-modified'] : null);
  });
}

function saveFile(link, name){
  fs.writeFile(name, function (){
    console.log('file created');
    var writeStream = fs.createWriteStream(name);
    request(link).pipe(writeStream).on('close', function (){
      getLastModifiedDate(link, function (date){
        fs.utimesSync(name, new Date(), new Date(date));
      });
    }); 
  });
}

function processRefs(refs){
  for (var i = 0, li = refs.length; i < li; i++){
    (function (ref){
      var 
        fileName = getFile(ref),
        dir = seekDir(ref),
        cachedFile = path.join(dir, fileName);
      
      fs.exists(cachedFile, function (exists){
        if (exists){
          getLastModifiedDate(ref, function (date){
            if (date != null){
              fs.stat(cachedFile, function (err,props){
                if (props.mtime.getTime() !==  new Date(date).getTime()){
                  fs.unlink(cachedFile, function (){
                    saveFile(ref,cachedFile);
                  });
                }
              });
            }
          });
        }else{
          saveFile(ref,cachedFile);
        }
      });
    })(refs[i]);
  }
}

function getFile(link){
  return link.match(/[^\/]*$/)[0].replace(/\?|\\|<|>|:|\*|"/g,'');
}

function seekDir(link){
  var protocol = link.match(/^(http|https):\/\//g)[0];
  link = link.replace(protocol,'');
  var dirs = link.split('/');
  dirs.pop();
  var baseName = path.join(__dirname, '_cache');
  for (var i = 0, li = dirs.length; i < li; i++){
    baseName = path.join(baseName,dirs[i]);
    try{fs.mkdirSync(baseName);}catch (e){}
  }
  return baseName;
}