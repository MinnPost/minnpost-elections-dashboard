/**
 * Some core functionality for minnpost applications
 */

/**
 * Global variable to hold the "applications".
 */
var mpApps = mpApps || {};
var mpTemplates = mpTemplates || {};
mpTemplates['minnpost-elections-dashboard'] = mpTemplates['minnpost-elections-dashboard'] || {};

/**
 * Extend underscore
 */
_.mixin({
  /**
   * Formats number 
   */
  formatNumber: function(num, decimals) {
    decimals = (_.isUndefined(decimals)) ? 2 : decimals;
    var rgx = (/(\d+)(\d{3})/);
    split = num.toFixed(decimals).toString().split('.');
    
    while (rgx.test(split[0])) {
      split[0] = split[0].replace(rgx, '$1' + ',' + '$2');
    }
    return (decimals) ? split[0] + '.' + split[1] : split[0];
  },
  
  /**
   * Formats number into currency
   */
  formatCurrency: function(num) {
    return '$' + _.formatNumber(num, 2);
  },
  
  /**
   * Formats percentage
   */
  formatPercent: function(num) {
    return _.formatNumber(num * 100, 1) + '%';
  },
  
  /**
   * Formats percent change
   */
  formatPercentChange: function(num) {
    return ((num > 0) ? '+' : '') + _.formatPercent(num);
  }
});
  
/**
 * Override Backbone's ajax function to use $.jsonp as it handles
 * errors for JSONP requests
 */
if (!_.isUndefined(Backbone) && !_.isUndefined($.jsonp) && _.isFunction(Backbone.$.jsonp)) {
  Backbone.ajax = function() {
    return Backbone.$.jsonp.apply(Backbone.$, arguments);
  };
}

/**
 * Create "class" for the main application.  This way it could be
 * used more than once.
 */
(function($, undefined) {
  var App;
  var appTemplates = mpTemplates['minnpost-elections-dashboard'] || {};
  
  mpApps['minnpost-elections-dashboard'] = App = (function() {
    function App(options) {
      this.options = _.extend(this.defaultOptions, options);
      this.$el = $(this.options.el);
    }
    
    // Default options
    App.prototype.defaultOptions = {
      dataPath: './data/',
      jsonpProxy: 'http://mp-jsonproxy.herokuapp.com/proxy?callback=?&url='
    };
  
    /**
     * Template handling.  For development, we want to use
     * the template files directly, but for build, they should be
     * compiled into JS.
     *
     * See JST grunt plugin to understand how templates
     * are compiled.
     *
     * Expects callback like: function(compiledTemplate) {  }
     */
    App.prototype.templates = appTemplates;
    App.prototype.getTemplate = function(name, callback, context) {
      var thisApp = this;
      var templatePath = 'js/templates/' + name + '.html';
      context = context || app;
      
      if (!_.isUndefined(this.templates[templatePath])) {
        callback.apply(context, [ this.templates[templatePath] ]);
      }
      else {
        $.ajax({
          url: templatePath,
          method: 'GET',
          async: false,
          contentType: 'text',
          success: function(data) {
            thisApp.templates[templatePath] = _.template(data);
            callback.apply(context, [ thisApp.templates[templatePath] ]);
          }
        });
      }
    };
    // Wrapper around getting a template
    App.prototype.template = function(name) {
      var templatePath = 'js/templates/' + name + '.html';
      return this.templates[templatePath];
    };
  
    /**
     * Data source handling.  For development, we can call
     * the data directly from the JSON file, but for production
     * we want to proxy for JSONP.
     *
     * `name` should be relative path to dataset minus the .json
     *
     * Returns jQuery's defferred object.
     */
    App.prototype.data = {};
    App.prototype.getLocalData = function(name) {
      var thisApp = this;
      var proxyPrefix = this.options.jsonpProxy;
      var useJSONP = false;
      var defers = [];
      
      name = (_.isArray(name)) ? name : [ name ];
      
      // If the data path is not relative, then use JSONP
      if (this.options && this.options.dataPath.indexOf('http') === 0) {
        useJSONP = true;
      }
      
      // Go through each file and add to defers
      _.each(name, function(d) {
        var defer;
        if (_.isUndefined(thisApp.data[d])) {
          
          if (useJSONP) {
            defer = $.jsonp({
              url: proxyPrefix + encodeURI(thisApp.options.dataPath + d + '.json')
            });
          }
          else {
            defer = $.getJSON(thisApp.options.dataPath + d + '.json');
          }
          
          $.when(defer).done(function(data) {
            thisApp.data[d] = data;
          });
          defers.push(defer);
        }
      });
      
      return $.when.apply($, defers);
    };
    
    /**
     * Get remote data.  Provides a wrapper around
     * getting a remote data source, to use a proxy
     * if needed, such as using a cache.
     */
    App.prototype.getRemoteData = function(options) {
      if (this.options.remoteProxy) {
        options.url = options.url + '&callback=proxied_jqjsp';
        options.url = app.options.remoteProxy + encodeURIComponent(options.url);
        options.callback = 'proxied_jqjsp';
        options.cache = true;
      }
      else {
        options.url = options.url + '&callback=?';
      }
      
      return $.jsonp(options);
    };
    
    // Placeholder start
    App.prototype.start = function() {
    };
    
    return App;
  })();
})(jQuery);