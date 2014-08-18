/**
 * Some helper functions
 */


/**
 * Helpers functions such as formatters or extensions
 * to libraries.
 */
define('helpers', ['jquery', 'underscore', 'backbone', 'moment', 'mpFormatters'],
  function($, _, Backbone, moment, formatters) {

  var helpers = {};
  var cacheURLIncrementer = {};

  /**
   * Override Backbone's ajax call to use JSONP by default as well
   * as force a specific callback to ensure that server side
   * caching is effective.
   */
  helpers.overrideBackboneAJAX = function() {
    Backbone.ajax = function() {
      var options = arguments;
      var hash;

      if (options[0].dataTypeForce !== true) {
        hash = formatters.hash(options[0].url);
        cacheURLIncrementer[hash] = (!_.isUndefined(cacheURLIncrementer[hash])) ?
          cacheURLIncrementer[hash] + 1 : 0;
        options[0].dataType = 'jsonp';
        options[0].jsonpCallback = 'mpServerSideCachingHelper' + hash +
          cacheURLIncrementer[hash];
      }
      return Backbone.$.ajax.apply(Backbone.$, options);
    };
  };

  /**
   * Add today formatting option function to moment.
   * See: http://stackoverflow.com/questions/10291495/moment-js-display-either-date-or-time
   */
  if (_.isObject(moment)) {
    moment.fn.formatToday = function(todayFormat, otherFormat) {
      var now = moment();
      todayFormat = todayFormat || '[at] h:mm a';
      otherFormat = otherFormat || '[on] MMM DD';

      if (this.date() === now.date() && Math.abs(this.diff(now)) < 86400000) {
        // same day of month and less than 24 hours difference
        return this.format(todayFormat);
      }
      else {
        return this.format(otherFormat);
      }
    };
  }

  /**
   * Returns version of MSIE.
   */
  helpers.isMSIE = function() {
    var match = /(msie) ([\w.]+)/i.exec(navigator.userAgent);
    return match ? parseInt(match[2], 10) : false;
  };

  /**
   * Wrapper for a JSONP request, the first set of options are for
   * the AJAX request, while the other are from the application.
   */
  helpers.jsonpRequest = function(requestOptions, appOptions) {
    var options = requestOptions;

    if (options.dataTypeForce !== true) {
      hash = formatters.hash(options.url);
      cacheURLIncrementer[hash] = (!_.isUndefined(cacheURLIncrementer[hash])) ?
        cacheURLIncrementer[hash] + 1 : 0;
      options.dataType = 'jsonp';
      options.jsonpCallback = 'mpServerSideCachingHelper' + hash +
        cacheURLIncrementer[hash];
    }

    return $.ajax.apply($, [options]);
  };

  /**
   * Data source handling.  For development, we can call
   * the data directly from the JSON file, but for production
   * we want to proxy for JSONP.
   *
   * `name` should be relative path to dataset
   * `options` are app options
   *
   * Returns jQuery's defferred object.
   */
  helpers.getLocalData = function(name, options) {
    var useJSONP = false;
    var defers = [];
    name = (_.isArray(name)) ? name : [ name ];

    // If the data path is not relative, then use JSONP
    if (options && options.paths && options.paths.data.indexOf('http') === 0) {
      useJSONP = true;
    }

    // Go through each file and add to defers
    _.each(name, function(d) {
      var defer;

      if (useJSONP) {
        defer = helpers.jsonpRequest({
          url: proxyPrefix + encodeURI(options.paths.data + d)
        }, options);
      }
      else {
        defer = $.getJSON(options.paths.data + d);
      }
      defers.push(defer);
    });

    return $.when.apply($, defers);
  };

  /**
   * Reads query string and turns into object.
   */
  helpers.parseQueryString = function() {
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
  };

  return helpers;
});
