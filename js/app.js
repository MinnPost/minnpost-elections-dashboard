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
            this.getTemplate('template-contest', function(compiledTemplate) {
              done.apply(context, []);
            }, this);
          }, this);
        }, this);
      }, this);
    },

    // Start function that starts the application.
    start: function() {
      var thisApp = this;

      this.getTemplates(function() {
        this.applicationView = new this.ApplicationView({
          el: this.$el,
          template: this.template('template-application')
        });
        this.footnoteView = new this.FootnoteView({
          el: this.$el.find('.footnote-container'),
          template: this.template('template-footnote')
        });

        // Create router which will handle most of the high
        // level logic
        this.router = new this.DashboardRouter(_.extend(this.options, { app: this }));
        this.router.start();
      }, this);
    }
  });
})(mpApps['minnpost-elections-dashboard'], jQuery);