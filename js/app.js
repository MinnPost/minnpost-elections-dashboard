/**
 * Main app logic for: minnpost-elections-dashboard
 */
(function(App, $, undefined) {
  _.extend(App.prototype, {
    // Get templates.  The get template method should be updated
    // to handle multiple templates.
    getTemplates: function(done, context) {
      this.getTemplate('template-application', function(compiledTemplate) {
        this.getTemplate('template-footnote', function(compiledTemplate) {
          this.getTemplate('template-loading', function(compiledTemplate) {
            done.apply(context, []);
          }, this);
        }, this);
      }, this);
    },

    // Start function that starts the application.
    start: function() {
      var thisApp = this;

      this.getTemplates(function() {
        this.$el.html(this.template('template-application')({ }));
        this.$el.find('.footnote-container').html(this.template('template-footnote')({ }));

        // Create router which will kick off the application
        this.router = new this.DashboardRouter(this.options);
      }, this);
    }
  });
})(mpApps['minnpost-elections-dashboard'], jQuery);