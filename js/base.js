/**
 * Base class(es) for applications.
 */

// Create main application
define(['jquery', 'underscore', 'backbone', 'lazyload', 'mpFormatters', 'text!../bower.json'],
  function($, _, Backbone, Lazyload, formatters, bower) {
  'use strict';

  var Base = {};
  bower = JSON.parse(bower);

  // Base App constructor
  Base.BaseApp = function(options) {
    // Attach options
    this.options = _.extend(this.baseDefaults || {}, this.defaults || {}, options || {});
    this.name = this.options.name;

    // Handle element if in options
    if (this.options.el) {
      this.el = this.options.el;
      this.$el = $(this.el);
      this.$ = function(selector) { return this.$el.find(selector); };
    }

    // Determine paths and get assesets
    this.determinePaths();
    this.renderAssests();

    // Run an initializer once CSS has been loaded
    this.on('cssLoaded', function() {
      this.initialize.apply(this, arguments);
    });
  };

  // Extend with Backbone Events and other properties
  _.extend(Base.BaseApp.prototype, Backbone.Events, {
    // Attach bower info
    bower: bower,

    // Default options
    baseDefaults: {
      jsonpProxy: '//mp-jsonproxy.herokuapp.com/proxy?url=',
      availablePaths: {
        local: {
          css: ['.tmp/css/main.css'],
          images: 'images/',
          data: 'data/'
        },
        build: {
          css: [
            'dist/[[[PROJECT_NAME]]].libs.min.css',
            'dist/[[[PROJECT_NAME]]].latest.min.css'
          ],
          images: 'dist/images/',
          data: 'dist/data/'
        },
        deploy: {
          css: [
            '//s3.amazonaws.com/data.minnpost/projects/' +
              '[[[PROJECT_NAME]]]/[[[PROJECT_NAME]]].libs.min.css',
            '//s3.amazonaws.com/data.minnpost/projects/' +
              '[[[PROJECT_NAME]]]/[[[PROJECT_NAME]]].latest.min.css'
          ],
          images: '//s3.amazonaws.com/data.minnpost/projects/[[[PROJECT_NAME]]]/images/',
          data: '//s3.amazonaws.com/data.minnpost/projects/[[[PROJECT_NAME]]]/data/'
        }
      }
    },

    // Determine paths.  A bit hacky.
    determinePaths: function() {
      var query;

      // Only handle once
      if (_.isObject(this.options.paths) && !_.isUndefined(this.options.deployment)) {
        return this.options.paths;
      }

      // Deploy by default
      this.options.deployment = 'deploy';

      if (window.location.host.indexOf('localhost') !== -1) {
        this.options.deployment = 'local';

        // Check if a query string forces something
        query = this.parseQueryString();
        if (_.isObject(query) && _.isString(query.mpDeployment)) {
          this.options.deployment = query.mpDeployment;
        }
      }

      this.options.paths = this.options.availablePaths[this.options.deployment];
      return this.options.paths;
    },

    // Get assests.  We use the rgrove lazyload library since it is simple
    // and small, but it is unmaintained.
    renderAssests: function() {
      var thisApp = this;
      var scripts = [];

      // Add CSS from bower dependencies
      _.each(this.bower.dependencyMap, function(c, ci) {
        if (c.css) {
          _.each(c.css, function(s, si) {
            // If local, add script, else only add external scripts
            if (thisApp.options.deployment === 'local') {
              s = (s.match(/^(http|\/\/)/)) ? s : 'bower_components/' + s + '.css';
              scripts.push(thisApp.makePath(s));
            }
            else if (s.match(/^(http|\/\/)/)) {
              scripts.push(thisApp.makePath(s));
            }
          });
        }
      });

      // Add app CSS
      _.each(this.options.paths.css, function(c, ci) {
        scripts.push(thisApp.makePath(c));
      });

      // Load and fire event when done
      Lazyload.css(scripts, function() {
        this.trigger('cssLoaded');
      }, null, this);
    },

    // Make path
    makePath: function(path) {
      path = path.split('[[[PROJECT_NAME]]]').join(this.name);
      if (this.options.basePath && !path.match(/^(http|\/\/)/)) {
        path = this.options.basePath + path;
      }
      return path;
    },

    // Override Backbone's ajax call to use JSONP by default as well
    // as force a specific callback to ensure that server side
    // caching is effective.
    overrideBackboneAJAX: function() {
      Backbone.ajax = function() {
        var options = arguments[0];
        if (options.dataTypeForce !== true) {
          return this.jsonpRequest(options);
        }
        return Backbone.$.ajax.apply(Backbone.$, [options]);
      };
    },

    // Unfortunately we need this more often than we should
    isMSIE: function() {
      var match = /(msie) ([\w.]+)/i.exec(navigator.userAgent);
      return match ? parseInt(match[2], 10) : false;
    },

    // Read query string
    parseQueryString: function() {
      var assoc  = {};
      var decode = function(s) {
        return decodeURIComponent(s.replace(/\+/g, " "));
      };
      var queryString = location.search.substring(1);
      var keyValues = queryString.split('&');

      _.each(keyValues, function(v, vi) {
        var key = v.split('=');
        if (key.length > 1) {
          assoc[decode(key[0])] = decode(key[1]);
        }
      });

      return assoc;
    },

    // Wrapper for a JSONP request, the first set of options are for
    // the AJAX request, while the other are from the application.
    //
    // JSONP is hackish, but there are still data sources and
    // services that we don't have control over that don't fully
    // support CORS
    jsonpRequest: function(options) {
      options.dataType = 'jsonp';

      // If no callback, use proxy
      if (this.options.jsonpProxy && options.url.indexOf('callback=') === -1) {
        options.jsonpCallback = 'mpServerSideCachingHelper' +
          formatters.hash(options.url);
        options.url = this.options.jsonpProxy + encodeURIComponent(options.url) +
          '&callback=' + options.jsonpCallback;
        options.cache = true;
      }

      return $.ajax.apply($, [options]);
    },


    // Project data source handling for data files that are not
    // embedded in the application itself.  For development, we can call
    // the data directly from the JSON file, but for production
    // we want to proxy for JSONP.
    //
    // Takes single or array of paths to data, relative to where
    // the data source should be.
    //
    // Returns jQuery's defferred object.
    dataRequest: function(datas) {
      var thisApp = this;
      var useJSONP = false;
      var defers = [];
      datas = (_.isArray(name)) ? datas : [ datas ];

      // If the data path is not relative, then use JSONP
      if (this.options.paths.data.indexOf('http') === 0) {
        useJSONP = true;
      }

      // Go through each file and add to defers
      _.each(datas, function(d) {
        var defer = (useJSONP) ?
          thisApp.jsonpRequest(thisApp.options.paths.data + d) :
          $.getJSON(thisApp.options.paths.data + d);
        defers.push(defer);
      });

      return $.when.apply($, defers);
    },

    // Empty initializer
    initialize: function() { }
  });

  // Add extend from Backbone
  Base.BaseApp.extend = Backbone.Model.extend;


  return Base;
});
