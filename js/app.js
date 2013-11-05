/**
 * Main app logic for: minnpost-elections-dashboard
 */
(function(App, $, undefined) {
  _.extend(App.prototype, {

    // Default options
    defaultOptions: {
      dataPath: './data/',
      jsonpProxy: 'http://mp-jsonproxy.herokuapp.com/proxy?url=',
      electionsAPI: 'http://54.204.17.59/?box=ubuntu&q=',
      electionsAPILocal: 'http://localhost:5000/?q=',
      boundaryAPI: 'http://boundaries.minnpost.com/1.0/',
      boundarySets: [
        'counties-2010',
        'county-commissioner-districts-2012',
        'minneapolis-parks-and-recreation-districts-2014',
        'minor-civil-divisions-2010',
        'school-districts-2013',
        'wards-2012'
      ],
      // Please don't steal/abuse
      mapQuestKey: 'Fmjtd%7Cluub2d01ng%2C8g%3Do5-9ua20a',
      mapQuestQuery: 'http://www.mapquestapi.com/geocoding/v1/address?key=[[[KEY]]]&outFormat=json&countrycodes=us&maxResults=1&location=[[[ADDRESS]]]',
      originalTitle: document.title,
      capabilities: {
        typeahead: (_.isMSIE() !== 9),
        preventLinks: (!_.isMSIE() && _.isMSIE() <= 9)
      }
    },

    // Start function that starts the application.
    start: function() {
      var thisApp = this;
      var templates = ['template-application', 'template-footnote', 'template-dashboard', 'template-loading', 'template-contest', 'template-contests', 'template-dashboard-contest'];

      this.getTemplates(templates).done(function() {
        // Render the container and "static" templates.
        thisApp.applicationView = new thisApp.ApplicationView({
          el: thisApp.$el,
          template: thisApp.template('template-application')
        });
        thisApp.footnoteView = new thisApp.FootnoteView({
          el: thisApp.$el.find('.footnote-container'),
          template: thisApp.template('template-footnote')
        });

        // Create router which will handle most of the high
        // level logic
        thisApp.router = new thisApp.DashboardRouter(_.extend(thisApp.options, { app: thisApp }));
        thisApp.router.start();

        // Try to ensure that links are prevented from their default
        // behavior.  Sometimes because of Ractive's dom insertions, the
        // preventDefault is not handled correctly
        if (thisApp.options.capabilities.preventLinks) {
          $('a[href^="#"]').on('click', thisApp.$el, function(e) {
            e.preventDefault();
            thisApp.router.navigate($(this).attr('href'), { trigger: true });
          });
        }
      });
    }
  });
})(mpApps['minnpost-elections-dashboard'], jQuery);