$(function (){
  'use strict';
  
  var 
    socket = new WebSocket('ws://localhost:8090', 'protocolOne'),
    k = new Konsole();
    
  // just registering
  socket.onopen = function (event) {};
  
  socket.onmessage = function (e) {
    var data = JSON.parse(e.data);
    switch (data.type){
      case 'start':
        k.log(data.msg);
        k.ask('Enter the target site:', function (url){
          socket.send(JSON.stringify({type:'set-url',val:url}));
          k.log('Processing...').log('>');
        });
        break;
      case 'end':
        k.log(data.msg,'end');
        k.ask('Reset? (Y/y) yes', function (answer){
          if (/Y/ig.test(answer)){
            window.location.reload();
          }
        });
        break;
      case 'error':
        k.log(data.msg,'error');
        break;
      case 'status':
        k.log(data.msg);
        break;
      case 'progress':
        k.progress(data.msg);
        break;
      case 'extract-refs':
        k.log('Extracting references...').log('>');
        var 
          html = $.parseHTML(data.val,document,true),
          $parsed = $(html),
          refs = [];
          
        refs.putRef = function (ref){
          if (this.indexOf(ref) === -1){
            this.push(ref);
            k.log(this[this.length-1]);
          }
        }
        
        // external/internal file detection
        $parsed.find('*').andSelf().each(function (a){
          if ($(this).attr('src')){
            refs.putRef($(this).attr('src'));
          }
          if ($(this).attr('data')){
            refs.putRef($(this).attr('data'));
          }
          if ($(this).attr('href') && ($(this).attr('type') === 'text/css' || ['icon','stylesheet'].indexOf($(this).attr('rel')) > -1)){
            refs.putRef($(this).attr('href'));
          }
        });
        
        socket.send(JSON.stringify({type:'refs',val:refs}));
        break;
    }
  };
 
  
  // Konsole object
  // log some stuff right in the mouth
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
      $('window, body').scrollTop(($c.find('> *:last-child').offset().top - 250))
    }
  
    Object.defineProperties(this, {
      log: {
        value: function (v, type) { 
          $c.append(
            $('<span></span>').text(v).addClass(type),
            $('<br />')
          );
          afterPrint();
          return this;
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
          return this;
        },
        enumerable: true
      },
      ask:{
        value: function (question,callback){
          this.log(question);
          $c.append($('<span id="input" />'));
          $(window).on('keydown.input', function (e){
            if (e.ctrlKey && e.keyCode === 86){
              var value = prompt('Past here');
              if (value){
                $('#input').text(value.substring(0,value.length - 1));
              }
              return;
            }
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
              $('#input').removeAttr('id');
              $c.append($('<br />'));
              callback(value);
            }else{
              $('#input').text(value + String.fromCharCode(e.keyCode));
            }
            return false;
          });
          afterPrint();
          return this;
        }
      }
    });
    
    Object.seal(this);
  };
  Konsole.constructor = Konsole;
  Object.defineProperty(window, 'Konsole', { value: Konsole, enumerable: true });
});