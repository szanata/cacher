(function($){
		
	$.fn.enquete = function(url, estado) {
		var context = $(this);
		var popin = $('.enquete-popin',context);
		var form_element = $('.enquete-form',context);
		var form_id = form_element.attr('id');
		var validar_enquete = null;
		var popinMsg = $('.enquete-popin-mensagens',context);
		var popinResultado = $('.enquete-popin-resultado',context);
		var opcoesPopin = $.extend($.ui.dialog.defaults, {
			autoOpen: true,
	        modal: true,
	        draggable: false,
	        width: 500,
	        zIndex: 100000,
	        title: 'Interatividade',
	        dialogClass: 'enquete-popin-container'
		});
		var eventos = {
			abrir: function() {
				var self = this;
		        $('.participe a',context).unbind('click.enquete').bind('click.enquete',function(){
		            self.gerarPopin();
		            return false;
		        });
			},
			gerarPopin : function() {
				 var self = this;
			        var opcoes = $.extend(opcoesPopin, {
			            beforeclose: function(e){
			                self.limpaFormulario();
			                popin.dialog('destroy');
			                return false;
			            },
			            open: function(event,ui) {
							RecaptchaCreate.load(form_id);
							self.captchaReload();
							self.validarVoto();
			                $('.acoes .votar a',popin).unbind('click.enquete').bind('click.enquete',function(){
								$(form_element).submit();
			                    return false;
			                });
			                self.desativarConfirmacao();
			            }
			        });

			        popin.dialog(opcoes);
			},
			captchaReload: function() {
		        $('.recaptcha_reload',popin).unbind('click.enquete').bind('click.enquete',function(){
		            Recaptcha.reload();
		            return false;
		        });
		    },
		    desativarConfirmacao: function() {
		        var $confirmacao = $('.enquete-popin-container .confirmacao',context);
		        $confirmacao.css('opacity','0.6');
		        $('.enquete-popin-container .respostas input:radio',context).bind('change',function(){
		            $confirmacao.css('opacity','1');
		        });
		    },
			limpaFormulario: function(){
		        var self = this;
		        Recaptcha.reload();
		        validar_enquete.resetForm();
		        //bug no validate que nao reseta as classes usadas no highlight e unhighlight
		        $('.campo_recaptcha',popin).parent().removeClass('campo-error');
		    },
			resultadoParcial: function(){
		        var self = this;
		        var botaoResultadoParcial = $('.resultado-parcial a',context);

		        botaoResultadoParcial.click(function(){
		            $.get(url, function(data){
		                var opcoes = $.extend(opcoesPopin, {
		                    title: estado=='encerrada'? 'Vota&ccedil;&otilde;es Encerradas!': 'Interatividade',
		                    beforeclose: function(e){
		                        popinResultado.dialog('destroy');
		                        return false;
		                    }
		                });
		                popinResultado
		                    .html(self.resultadoTemplate(data))
		                    .dialog(opcoes);
		            });

		            return false;
		        });
		    },
		    resultadoTemplate:function(data){
		        var template = '<div class="resultado-container">'+
		                    '<p class="pergunta">'+data.enquete.dados.pergunta+'</p>'+
		                    '<ul class="respostas">';
		                    var opcoes = data.enquete.opcoes;
		                    for (var i=0; i < opcoes.length; i++){

		                        var ultimo = i + 1 == opcoes.length ? 'class=ultimo' : '';
		                        template +=  '<li '+ ultimo +' ><p class="resposta"><span class="percentual" >'+opcoes[i].percentual+'% </span><span class="item-resposta">'+opcoes[i].resposta+'</span></p></li>';
		                    }
		                    template += '</ul></div>';
		                    return template;
		    },
		    validarVoto: function() {
		        var self = this;
		        var config = {
		               focusInvalid: false,
		               onkeyup: false,
		               onfocusout: false,
		               onclick: false,
		               errorElement: 'p',
		               rules: {
		                   opcao_id : {
		                       required: true
		                   },
		                   recaptcha_response_field : 'required'
		               },
		               messages: {
		                   opcao_id: 'Selecione uma op&ccedil;&atilde;o de resposta',
		                   recaptcha_response_field: 'Por favor, preencha os caracteres ao lado'
		               },
		               highlight: function(element,errorClass) {
		                   $(element).addClass(errorClass);
		                   var parent = $(element).parent();
		                   if(parent.hasClass('caracteres-container')) parent.addClass('campo-error');
		              },
		              unhighlight: function(element,errorClass) {
		                   $(element).removeClass(errorClass);
		                   var parent = $(element).parent();
		                   if(parent.hasClass('caracteres-container')) parent.removeClass('campo-error');
		              },
		               errorPlacement: function(error, element) {
		                    if($(element).attr('type') == 'radio') {
		                        error.insertAfter($('.enquete-popin .respostas'));
		                    } else {
		                        error.insertAfter($(element).parent());
		                    }
		               },
		               submitHandler: self.enviarVoto

		        };
		        
				validar_enquete = $(form_element).validate(config);
		    },
		    enviarVoto: function(form) {
		        var self = this;
		        $(form).ajaxSubmit({
		            type: 'get',
		            dataType: 'jsonp',
		            success: function (data) {
		                
		                var opcoes = $.extend(opcoesPopin, {
		                    beforeclose: function(e){
		                        popinMsg.dialog('destroy');
		                        return false;
		                    }
		                });

		                if(data.toString() === 'recaptcha invalido') {
		                    validar_enquete.showErrors({
		                        'recaptcha_response_field' : 'Os caracteres digitados est&atilde;o incorretos'
		                    });
		                    $('.recaptcha_reload',popin).trigger('click.enquete');

		                } else if(data.toString() === 'ok') {
		                    popin.dialog('close');
		                    popinMsg
		                        .html('<p>Voto computado com sucesso</p>')
		                        .dialog(opcoes);
		                } else {
		                    popin.dialog('close');
		                    popinMsg
		                        .html('<p>N&atilde;o foi poss&iacute;vel computar seu voto.</p>')
		                        .dialog(opcoes);
		                }
		            }
		        });
		        return false;
		    }
			
		};
		
		//iniciando os eventos
		eventos.abrir();
		eventos.resultadoParcial();
	};
})(jQuery);
