RecaptchaCreate = {
    options: {
        theme : 'custom',
        lang : 'pt',
        custom_theme_widget : 'recaptcha_widget'
    },
    load: function(context) {
        Recaptcha.create('6LchUQsAAAAAAId94gWZJ60lozB5hgRQkE8fbCww', context, this.options);
    }
};
