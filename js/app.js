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
      electionsAPI: '//premium.scraperwiki.com/ez47yoa/aaff8e67f921428/sql/?q=',
      // Local: '//localhost:5000/?q='
      // Custom: '//54.91.220.106/?box=ubuntu/minnpost-scraper-mn-election-results&method=sql&q='
      // ScraperWiki: '//premium.scraperwiki.com/ez47yoa/aaff8e67f921428/sql/?q='
      boundaryAPI: '//boundaries.minnpost.com/1.0/',
      boundarySets: [
        'minor-civil-divisions-2010',
        'wards-2012',
        'minnesota-state-2014',
        'school-districts-2013',
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
          title: 'Congressional District 2, Republicans',
          show_party: 'R',
          itemClass: 'congress-district',
          id: 'id-MN---2-0105',
          rows: 4
        },
        {
          type: 'race',
          title: 'MN Supreme Court Associate Justice',
          itemClass: 'supreme-court',
          id: 'id-MN----7007',
          rows: 3
        },
        {
          type: 'race',
          title: 'Hennepin County Commissioner, District 5',
          itemClass: 'county-commissioner',
          id: 'id-MN-27--05-0395',
          rows: 6
        },
        {
          type: 'spacer'
        },
        {
          type: 'spacer'
        },
        {
          type: 'race',
          title: 'State House district 60B, DFL',
          show_party: 'DFL',
          itemClass: 'state-house',
          id: 'id-MN---60B-0307',
          rows: 3
        },
        {
          type: 'race',
          title: 'State House district 31A, GOP',
          show_party: 'R',
          itemClass: 'state-house',
          id: 'id-MN---31A-0248',
          rows: 2
        },
        {
          type: 'race',
          title: 'State Senator distrirct 62, DFL',
          show_party: 'DFL',
          itemClass: 'state-senate',
          id: 'id-MN---62-0182',
          rows: 2
        },
        {
          type: 'race',
          title: 'State House district 65A',
          show_party: 'DFL',
          itemClass: 'state-house',
          id: 'id-MN---65A-0316',
          rows: 2
        },
        {
          type: 'links',
          itemClass: 'dashboard-links',
          links: [
            { href: '#search/state+senator', text: 'All State Senate' },
            { href: '#search/state+representative', text: 'All State House' },
            { href: '#search/question', text: 'Ballot questions' }
          ]
        }
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
