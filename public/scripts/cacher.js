$(function (){
  'use strict';
  
  var 
    socket = new WebSocket('ws://localhost:8090', 'protocolOne'),
    k = new Konsole();
    
  socket.onopen = function (event) {
    //socket.send(); 
  };
  
  socket.onmessage = function (e) {
    var data = JSON.parse(e.data);
    switch (data.type){
      case 'start':
        k.log(data.msg);
        k.ask('Enter the target site:', function (url){
          socket.send(JSON.stringify({type:'set-url',val:url}));
          k.log('Processing');
        });
        break;
      case 'status':
        k.log(data.msg);
        break;
      case 'progress':
        k.progress(data.msg);
        break;
      case 'extract-refs':
        k.log('Extracting references...');
        var 
          html = $.parseHTML(data.val,document,true),
          $parsed = $(html),
          refs = [];
        $parsed.filter('[src]').each(function (){
          refs.push($(this).attr('src'));
          k.log(refs[refs.length-1]);
        });
        $parsed.filter('[href]').each(function (){
          if ($(this).attr('type') === 'text/css'){
            refs.push($(this).attr('href'));
            k.log(refs[refs.length-1]);
          }
        });
        socket.send(JSON.stringify({type:'refs',val:refs}));
        break;
    }
  };
 
  
  // Konsole class
  function Konsole() {
  
    var 
      $c = $('#console'),
      $cursor = $('<span id="cursor">_</span>');
      
    setInterval(function (){
      $cursor[$cursor.is(':hidden') ? 'show' : 'hide']();
    },500);
    
    $cursor.appendTo($c);
    $(window).on('keypress keydown keyup',function (e){
      if ($('#input').size() === 0){e.preventDefault();}
    });
    
    function afterPrint(){
      $cursor.insertAfter($c.find(':last-child'));
      $c.scrollTop($c.find(':last-child').position().top);
    }
  
    Object.defineProperties(this, {
      log: {
        value: function (v) { 
          $c.append(
            $('<span></span>').text(v),
            $('<br />')
          );
          afterPrint();
        },
        enumerable: true
      },
      progress: {
        value: function (v) { 
          if ($('.progress').next().next().attr('id') === 'cursor'){
            $('.progress').text(v);
          } else {
            $c.append(
              $('<span class="progress"></span>').text(v),
              $('<br />')
            );
          }
          afterPrint();
        },
        enumerable: true
      },
      ask:{
        value: function (question,callback){
          this.log(question);
          $c.append($('<span id="input" />'));
          $(window).on('keydown.input', function (e){
            if (e.keyCode === 8){
              e.preventDefault();
              var value = $('#input').text();
              $('#input').text(value.substring(0,value.length - 1));
            }
          });
          $(window).on('keypress.input', function (e){
            e.preventDefault();
            var value = $('#input').text();
            if (e.keyCode === 13){
              $(window).unbind('keypress.input');
              $(this).removeAttr('id');
              $c.append($('<br />'));
              callback(value);
            }else{
              $('#input').text(value + String.fromCharCode(e.keyCode));
            }
            return false;
          });
          afterPrint();
        }
      }
    });
    
    Object.seal(this);
  };
  Konsole.constructor = Konsole;
  Object.defineProperty(window, 'Konsole', { value: Konsole, enumerable: true });
});