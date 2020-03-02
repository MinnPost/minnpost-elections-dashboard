/**
 * Main application file for: minnpost-elections-dashboard
 *
 * This pulls in all the parts
 * and creates the main object for the application.
 */

// Create main application
require(['jquery', 'underscore', 'screenfull', 'base', 'helpers', 'views', 'routers',
  'mpConfig',
  'text!templates/dashboard-state-leg.mustache'],
  function($, _, screenfull, Base, helpers, views, routers, mpConfig, tDStateLeg) {

  // Create new class for app
  var App = Base.BaseApp.extend({

    defaults: {
      name: 'minnpost-elections-dashboard',
      remoteProxy: '//mp-jsonproxy.herokuapp.com/proxy?callback=?&url=',
      el: '.minnpost-elections-dashboard-container',
      // Hard page refresh, in case the interface needs to be
      // updated through the night
      interfaceRefresh: 1000 * 60 * 30,
      electionsAPIPollInterval: 50000,
      electionsAPI: 'https://elections-scraper.minnpost.com/?box=ubuntu/minnpost-scraper-mn-election-results&method=sql&q=',
      // Local: '//localhost:5000/?q='
      // Custom: '//54.91.220.106/?box=ubuntu/minnpost-scraper-mn-election-results&method=sql&q='
      // MinnPost-specific: 'https://elections-scraper.minnpost.com/?box=ubuntu/minnpost-scraper-mn-election-results&method=sql&q='
      // ScraperWiki: '//premium.scraperwiki.com/ez47yoa/aaff8e67f921428/sql/?q='
      boundaryAPI: '//represent-minnesota.herokuapp.com/',
      boundarySets: [
        'minor-civil-divisions-2010',
        'wards-2012',
        'minnesota-state-2014',
        'school-districts-2018',
        'minneapolis-parks-and-recreation-districts-2012',
        'congressional-districts-2012',
        'state-senate-districts-2012',
        'state-house-districts-2012',
        'hospital-districts-2012',
        'district-courts-2012',
        'county-commissioner-districts-2012',
        'counties-2010'
      ],
      npParties: ['WI', 'NP'],
      // Please don't steal/abuse
      mapQuestKey: 'Fmjtd%7Cluur20a7n0%2C8n%3Do5-9a1s9f',
      mapQuestQuery: '//open.mapquestapi.com/geocoding/v1/address?key=[[[KEY]]]&outFormat=json&countrycodes=us&maxResults=1&location=[[[ADDRESS]]]',
      originalTitle: document.title,
      dashboard: [
        {
          type: 'race',
          customTitle: 'U.S. President — Statewide',
          id: 'id-MN----0100',
          show_party: 'DFL',
          rows: 5
        },
        {
          type: 'race',
          customTitle: 'U.S. President — CD1',
          id: 'id-MN---1-0100',
          rows: 5,
          show_party: 'DFL'
        },
        {
          type: 'race',
          customTitle: 'U.S. President — CD2',
          id: 'id-MN---2-0100',
          rows: 5,
          show_party: 'DFL'
        },
        {
          type: 'race',
          customTitle: 'U.S. President — CD3',
          id: 'id-MN---3-0100',
          rows: 5,
          show_party: 'DFL'
        },
        {
          type: 'race',
          customTitle: 'U.S. President — CD4',
          id: 'id-MN---4-0100',
          rows: 5,
          show_party: 'DFL'
        },
        {
          type: 'race',
          customTitle: 'U.S. President — CD5',
          id: 'id-MN---5-0100',
          rows: 5,
          show_party: 'DFL'
        },
        {
          type: 'race',
          customTitle: 'U.S. President — CD6',
          id: 'id-MN---6-0100',
          rows: 5,
          show_party: 'DFL'
        },
        {
          type: 'race',
          customTitle: 'U.S. President — CD7',
          id: 'id-MN---7-0100',
          rows: 5,
          show_party: 'DFL'
        },
        {
          type: 'race',
          customTitle: 'U.S. President — CD8',
          id: 'id-MN---8-0100',
          rows: 5,
          show_party: 'DFL'
        },
      ]
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
      this.footnoteView = new views.FootnoteView({
        el: this.$el.find('.footnote-container')
      });

      // Handle fullscreen mode button.  Safari does not allow input in
      // fullscreen mode, but not sure how to tell if Safari
      this.applicationView.on('toggleFullscreen', function(e) {
        e.original.preventDefault();

        this.set('isFullscreen', !this.get('isFullscreen'));
        thisApp.$el.toggleClass('fullscreen');

        if (screenfull.enabled) {
          screenfull.toggle();
        }
      });
      // Also handle fullscreen event, actually just the Esc.  Alt-shift-F does
      // not seem to trigger an event
      if (screenfull.enabled) {
        $(document).on(screenfull.raw.fullscreenchange, function () {
          if (!screenfull.isFullscreen) {
            thisApp.applicationView.set('isFullscreen', false);
            thisApp.$el.removeClass('fullscreen');
          }
          else {
            thisApp.applicationView.set('isFullscreen', true);
            thisApp.$el.addClass('fullscreen');
          }
        });
      }

      // Create router which will handle most of the high
      // level logic
      this.router = new routers.DashboardRouter(_.extend(this.options, { app: this }));
      this.router.start();
    }
  });

  // Instantiate
  return new App({});
});
