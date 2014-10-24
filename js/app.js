/**
 * Main application file for: minnpost-elections-dashboard
 *
 * This pulls in all the parts
 * and creates the main object for the application.
 */

// Create main application
define('minnpost-elections-dashboard', [
  'jquery', 'underscore', 'ractive', 'mpConfig', 'mpFormatters',
  'helpers', 'views', 'routers'
], function(
  $, _, Ractive, mpConfig, mpFormatters,
  helpers, views, routers
  ) {

  // Constructor for app
  var App = function(options) {
    this.options = _.extend(this.defaultOptions, options);
    this.el = this.options.el;
    this.$el = $(this.el);
    this.$ = function(selector) { return this.$el.find(selector); };
    this.$content = this.$el.find('.content-container');
    this.loadApp();
  };

  // Extend with custom methods
  _.extend(App.prototype, {
    // Start function
    start: function() {
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

      // Try to ensure that links are prevented from their default
      // behavior.  Sometimes because of Ractive's dom insertions, the
      // preventDefault is not handled correctly
      if (this.options.capabilities.preventLinks) {
        $('a[href^="#"]').on('click', this.$el, function(e) {
          e.preventDefault();
          thisApp.router.navigate($(this).attr('href'), { trigger: true });
        });
      }

      //helpers.getLocalData('neighborhood-stop-data.topo.json', this.options).done(function(data) {
    },

    // Default options
    defaultOptions: {
      projectName: 'minnpost-elections-dashboard',
      remoteProxy: '//mp-jsonproxy.herokuapp.com/proxy?callback=?&url=',
      el: '.minnpost-elections-dashboard-container',
      electionsAPIPollInterval: 50000,
      electionsAPI: '//localhost:5000/?q=',
      electionsAPILocal: '//localhost:5000/?q=',
      electionsAPIEC2: '//50.19.100.197/?box=ubuntu&method=sql&q=',
      electionsAPIScraperWiki: '//premium.scraperwiki.com/ez47yoa/aaff8e67f921428/sql/?q=',
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
      originalTitle: document.title,
      capabilities: {
        typeahead: true, //(helpers.isMSIE() !== 9),
        preventLinks: (!helpers.isMSIE() && helpers.isMSIE() <= 9)
      },
      availablePaths: {
        local: {
          css: ['.tmp/css/main.css'],
          images: 'images/',
          data: 'data/'
        },
        build: {
          css: [
            '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css',
            'dist/minnpost-elections-dashboard.libs.min.css',
            'dist/minnpost-elections-dashboard.latest.min.css'
          ],
          ie: [
            'dist/minnpost-elections-dashboard.libs.min.ie.css',
            'dist/minnpost-elections-dashboard.latest.min.ie.css'
          ],
          images: 'dist/images/',
          data: 'dist/data/'
        },
        deploy: {
          css: [
            '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css',
            '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/minnpost-elections-dashboard.libs.min.css',
            '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/minnpost-elections-dashboard.latest.min.css'
          ],
          ie: [
            '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/minnpost-elections-dashboard.libs.min.ie.css',
            '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/minnpost-elections-dashboard.latest.min.ie.css'
          ],
          images: '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/images/',
          data: '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/data/'
        }
      }
    },

    // Load up app
    loadApp: function() {
      this.determinePaths();
      this.getLocalAssests(function(map) {
        this.renderAssests(map);
        this.start();
      });
    },

    // Determine paths.  A bit hacky.
    determinePaths: function() {
      var query;
      this.options.deployment = 'deploy';

      if (window.location.host.indexOf('localhost') !== -1) {
        this.options.deployment = 'local';

        // Check if a query string forces something
        query = helpers.parseQueryString();
        if (_.isObject(query) && _.isString(query.mpDeployment)) {
          this.options.deployment = query.mpDeployment;
        }
      }

      this.options.paths = this.options.availablePaths[this.options.deployment];
    },

    // Get local assests, if needed
    getLocalAssests: function(callback) {
      var thisApp = this;

      // If local read in the bower map
      if (this.options.deployment === 'local') {
        $.getJSON('bower.json', function(data) {
          callback.apply(thisApp, [data.dependencyMap]);
        });
      }
      else {
        callback.apply(this, []);
      }
    },

    // Rendering tasks
    renderAssests: function(map) {
      var isIE = (helpers.isMSIE() && helpers.isMSIE() <= 8);

      // Add CSS from bower map
      if (_.isObject(map)) {
        _.each(map, function(c, ci) {
          if (c.css) {
            _.each(c.css, function(s, si) {
              s = (s.match(/^(http|\/\/)/)) ? s : 'bower_components/' + s + '.css';
              $('head').append('<link rel="stylesheet" href="' + s + '" type="text/css" />');
            });
          }
          if (c.ie && isIE) {
            _.each(c.ie, function(s, si) {
              s = (s.match(/^(http|\/\/)/)) ? s : 'bower_components/' + s + '.css';
              $('head').append('<link rel="stylesheet" href="' + s + '" type="text/css" />');
            });
          }
        });
      }

      // Get main CSS
      _.each(this.options.paths.css, function(c, ci) {
        $('head').append('<link rel="stylesheet" href="' + c + '" type="text/css" />');
      });
      if (isIE) {
        _.each(this.options.paths.ie, function(c, ci) {
          $('head').append('<link rel="stylesheet" href="' + c + '" type="text/css" />');
        });
      }

      // Add a processed class
      this.$el.addClass('processed');
    }
  });

  return App;
});


/**
 * Run application
 */
require(['jquery', 'minnpost-elections-dashboard'], function($, App) {
  $(document).ready(function() {
    var app = new App();
  });
});
