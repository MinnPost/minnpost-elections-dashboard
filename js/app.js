/**
 * Main application file for: minnpost-elections-dashboard
 *
 * This pulls in all the parts
 * and creates the main object for the application.
 */

// Create main application
require(['jquery', 'underscore', 'base', 'helpers', 'views', 'routers'],
  function($, _, Base, helpers, views, routers) {

  // Create new class for app
  var App = Base.BaseApp.extend({

    defaults: {
      projectName: 'minnpost-elections-dashboard',
      remoteProxy: '//mp-jsonproxy.herokuapp.com/proxy?callback=?&url=',
      el: '.minnpost-elections-dashboard-container',
      electionsAPIPollInterval: 50000,
      electionsAPI: '//50.19.100.197/?box=ubuntu&method=sql&q=',
      // Local: '//localhost:5000/?q='
      // Custom: '//50.19.100.197/?box=ubuntu&method=sql&q='
      // ScraperWiki: '//premium.scraperwiki.com/ez47yoa/aaff8e67f921428/sql/?q='
      boundaryAPI: '//boundaries.minnpost.com/1.0/',
      boundarySets: [
        'counties-2010',
        'minor-civil-divisions-2010',
        'school-districts-2013',
        'wards-2012',
        'state-house-districts-2012',
        'state-senate-districts-2012',
        'minnesota-state-2014',
        'district-courts-2012'
      ],
      // Please don't steal/abuse
      mapQuestKey: 'Fmjtd%7Cluur20a7n0%2C8n%3Do5-9a1s9f',
      mapQuestQuery: '//open.mapquestapi.com/geocoding/v1/address?key=[[[KEY]]]&outFormat=json&countrycodes=us&maxResults=1&location=[[[ADDRESS]]]',
      originalTitle: document.title
    },

    // When the app is ready to go
    initialize: function() {
      var thisApp = this;

      // Override Backbone's AJAX
      helpers.overrideBackboneAJAX();

      // Render the container and "static" templates.
      this.applicationView = new views.ApplicationView({
        el: this.$el
      });
      thisApp.footnoteView = new views.FootnoteView({
        el: this.$el.find('.footnote-container')
      });

      // Create router which will handle most of the high
      // level logic
      this.router = new routers.DashboardRouter(_.extend(this.options, { app: this }));
      this.router.start();
    }
  });

  // Instantiate
  return new App({});
});
