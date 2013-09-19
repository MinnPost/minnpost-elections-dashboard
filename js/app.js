/**
 * Main app logic for: minnpost-elections-dashboard
 */
(function(app, $, undefined) {
  // Start function that starts the application.  This is not
  // necessary, but just a helpful way to do this.  The main
  // application HTML file calls this by default.
  app.prototype.start = function() {
    // Add in footnote HTML
    this.getTemplate('template-footnote', function(compiledTemplate) {
      $(this.options.el).append(compiledTemplate({ }));
    }, this);
  };
  
  // Get templates.  The get template method should be updated
  // to handle multiple templates.
  app.prototype.getTemplates = function(done, context) {
    this.getTemplate('template-application', function(compiledTemplate) {
      this.getTemplate('template-footnote', function(compiledTemplate) {
        this.getTemplate('template-loading', function(compiledTemplate) {
          done.apply(context, []);
        }, this);
      }, this);
    }, this);
  };
  
  // Start function that starts the application.
  app.prototype.start = function() {
    var thisApp = this;
  
    this.getTemplates(function() {
      this.$el.html(this.template('template-application')({ }));
      this.$el.find('.footnote-container').html(this.template('template-footnote')({ }));
      
      // Mark as loading
      this.$el.find('.message-container').html(this.template('template-loading')({ })).slideDown();
      
      // Do stuff like get data
      
      
      // Stop loading
      this.$el.find('.message-container').slideUp(function() {
        $(this).html('');
      });
      
    }, this);
  };
  
  
  
  
  
})(mpApps['minnpost-elections-dashboard'], jQuery);