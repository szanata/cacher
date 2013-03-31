/* 
* node.js app
* @author szanata
* purpose: given some site url, locate and cache (emulate browser cache behavior)
* every external file, excepts for those insite another external file, and save
* locally
*/

var 
  request = require("request"),
  fs = require('fs'),
  path = require('path'),
  express = require('express'),
  seeker = require('./seeker.js'),
  helpers = require('./helpers.js'),
  app = express(),
  assetManager = require('connect-assetmanager'),
  WebSocketServer = require('ws').Server,
  wss = new WebSocketServer({port: 8090}),
  baseUrl = undefined,
  remainingFiles = 0;

// minification (just for demo purpose, locally it's unecessary)
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

/*
* websocket communication protocol
* fullduplex web communication
*/
wss.on('connection', function (ws) {
 
  global.ws = ws;
  ws.on('message', function (raw) {
    var data = JSON.parse(raw);
    switch (data.type){
      case 'set-url':
        baseUrl = helpers.qualifyUrl(data.val);
        seeker.requestData(baseUrl, function (content){
          ws.send(JSON.stringify({type:'extract-refs',val:content}));
        });
        break;
      case 'refs':
        ws.send(JSON.stringify({type:'status',msg:'Starting file storage...'}));
        if (data.val.length === 0){
          ws.send(JSON.stringify({type:'status',msg:'No files found!'}));
        }else{
          processRefs(data.val);
        }
    }
  });
  ws.send(JSON.stringify({type:'start',msg:'Yeah! We\'re online!'}));
});

// app start configurations: nothing to do here
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
});

app.get('/', function (req,res){
  res.render('index');
});

app.listen(process.env.PORT || 8080);

/*
* using a bunch of references start this shit
*/
function processRefs(refs){
  remainingFiles = refs.length;
  refs.forEach(function (ref){
    (function (_ref){
      var 
        fileName = helpers.getFileName(_ref),
        dir = seekDir(_ref),
        cachedFile = path.join(dir, fileName);
      
      ws.send(JSON.stringify({type:'status',msg:'Handling with: {0}'.format(ref)}));
      fs.exists(cachedFile, function (exists){
        if (exists){
          checkLastModfiedData(_ref, cachedFile);
        }else{
          ws.send(JSON.stringify({type:'status',msg:'Saving file: {0}'.format(cachedFile)}));
          seeker.saveFile(_ref,cachedFile);
          notifyFileProcessEnd();
        }
      });
    })(helpers.isAbsoluteUrl(ref) ? ref : baseUrl + ref);
  });
}

/*
* try to get last modify date from external counterpart
*/
function checkLastModfiedData(ref, cachedFile){
  seeker.getLastModifiedDate(ref, function (date){
    if (date != null){
      updateFile(ref, cachedFile, date);
    }else{
      ws.send(JSON.stringify({type:'error',msg:'Can\'t read header (maybe your network have proxy :P), updating anyway: {0}'.format(cachedFile)}));
      seeker.saveFile(ref,cachedFile);
      notifyFileProcessEnd();
    }
  });
}

/*
* when some file ends its verifications notify here to check if it's the last one
*/
function notifyFileProcessEnd(){
  remainingFiles--;
  if (remainingFiles === 0){
    ws.send(JSON.stringify({type:'end',msg:'Process done.'}));
    ws.close();
  }
}

/*
* update some file if remote counterpart is newer
*/
function updateFile(ref, cachedFile, date){
  fs.stat(cachedFile, function (err,props){
    if (props.mtime.getTime() !==  new Date(date).getTime()){
      fs.unlink(cachedFile, function (){
        ws.send(JSON.stringify({type:'status',msg:'File is newer (stored {0}, and stored {1}). Updating file: {2}'.format(props.mtime.toUTCString(), new Date(date).toUTCString(), cachedFile)}));
        seeker.saveFile(ref,cachedFile);
        notifyFileProcessEnd();
      });
    }else{
      ws.send(JSON.stringify({type:'status',msg:'File not changed: {0}'.format(cachedFile)}));
      notifyFileProcessEnd();
    }
  }); 
}

/*
* using some file path, make the dirs to match it's external taxonomy
*/
function seekDir(ref){
  ref = ref.replace(/^(http|https):\/\//i,'');
  var dirs = ref.split('/');
  dirs.pop(); // removes file name
  var filePath = path.join(__dirname, '_cache');
  dirs.forEach(function (dir){
    filePath = path.join(filePath,dir);
    try{fs.mkdirSync(filePath);}catch (e){}
  });
  return filePath;
}