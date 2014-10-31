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
      electionsAPI: '//50.19.100.197/?box=ubuntu/minnpost-scraper-mn-election-results&method=sql&q=',
      // Local: '//localhost:5000/?q='
      // Custom: '//50.19.100.197/?box=ubuntu/minnpost-scraper-mn-election-results&method=sql&q='
      // ScraperWiki: '//premium.scraperwiki.com/ez47yoa/aaff8e67f921428/sql/?q='
      boundaryAPI: '//boundaries.minnpost.com/1.0/',
      boundarySets: [
        'minor-civil-divisions-2010',
        'wards-2012',
        'minnesota-state-2014',
        'school-districts-2013',
        'minneapolis-parks-and-recreation-districts-2012',
        'congressional-districts-2012',
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
          title: 'Governor',
          class: 'governor',
          id: 'id-MN----0331',
          numRows: 2
        },
        {
          type: 'race',
          title: 'Congressional District 8',
          class: 'congress-district',
          id: 'id-MN---08-0111',
          numRows: 2
        },
        {
          type: 'race',
          title: 'Congressional District 7',
          class: 'congress-district',
          id: 'id-MN---07-0110',
          numRows: 2
        },
        {
          type: 'race',
          title: 'U.S. Senator',
          class: 'us-senate',
          id: 'id-MN----0102',
          numRows: 2
        },
        {
          type: 'race',
          title: 'Secretary of State',
          class: 'sec-state',
          id: 'id-MN----0332',
          numRows: 2
        },
        {
          type: 'links',
          links: [
            { href: '#contest/id-MN----0333', text: 'State Auditor' },
            { href: '#contest/id-MN----0335', text: 'Attorney General' },
            { href: '#search/ssd+1', text: 'Minneapolis School Board' }
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
