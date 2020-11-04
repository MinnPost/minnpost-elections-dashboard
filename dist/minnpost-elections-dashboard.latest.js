/*jslint browser: true, eqeqeq: true, bitwise: true, newcap: true, immed: true, regexp: false */

/**
LazyLoad makes it easy and painless to lazily load one or more external
JavaScript or CSS files on demand either during or after the rendering of a web
page.

Supported browsers include Firefox 2+, IE6+, Safari 3+ (including Mobile
Safari), Google Chrome, and Opera 9+. Other browsers may or may not work and
are not officially supported.

Visit https://github.com/rgrove/lazyload/ for more info.

Copyright (c) 2011 Ryan Grove <ryan@wonko.com>
All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

@module lazyload
@class LazyLoad
@static
*/

LazyLoad = (function (doc) {
  // -- Private Variables ------------------------------------------------------

  // User agent and feature test information.
  var env,

  // Reference to the <head> element (populated lazily).
  head,

  // Requests currently in progress, if any.
  pending = {},

  // Number of times we've polled to check whether a pending stylesheet has
  // finished loading. If this gets too high, we're probably stalled.
  pollCount = 0,

  // Queued requests.
  queue = {css: [], js: []},

  // Reference to the browser's list of stylesheets.
  styleSheets = doc.styleSheets;

  // -- Private Methods --------------------------------------------------------

  /**
  Creates and returns an HTML element with the specified name and attributes.

  @method createNode
  @param {String} name element name
  @param {Object} attrs name/value mapping of element attributes
  @return {HTMLElement}
  @private
  */
  function createNode(name, attrs) {
    var node = doc.createElement(name), attr;

    for (attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        node.setAttribute(attr, attrs[attr]);
      }
    }

    return node;
  }

  /**
  Called when the current pending resource of the specified type has finished
  loading. Executes the associated callback (if any) and loads the next
  resource in the queue.

  @method finish
  @param {String} type resource type ('css' or 'js')
  @private
  */
  function finish(type) {
    var p = pending[type],
        callback,
        urls;

    if (p) {
      callback = p.callback;
      urls     = p.urls;

      urls.shift();
      pollCount = 0;

      // If this is the last of the pending URLs, execute the callback and
      // start the next request in the queue (if any).
      if (!urls.length) {
        callback && callback.call(p.context, p.obj);
        pending[type] = null;
        queue[type].length && load(type);
      }
    }
  }

  /**
  Populates the <code>env</code> variable with user agent and feature test
  information.

  @method getEnv
  @private
  */
  function getEnv() {
    var ua = navigator.userAgent;

    env = {
      // True if this browser supports disabling async mode on dynamically
      // created script nodes. See
      // http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order
      async: doc.createElement('script').async === true
    };

    (env.webkit = /AppleWebKit\//.test(ua))
      || (env.ie = /MSIE|Trident/.test(ua))
      || (env.opera = /Opera/.test(ua))
      || (env.gecko = /Gecko\//.test(ua))
      || (env.unknown = true);
  }

  /**
  Loads the specified resources, or the next resource of the specified type
  in the queue if no resources are specified. If a resource of the specified
  type is already being loaded, the new request will be queued until the
  first request has been finished.

  When an array of resource URLs is specified, those URLs will be loaded in
  parallel if it is possible to do so while preserving execution order. All
  browsers support parallel loading of CSS, but only Firefox and Opera
  support parallel loading of scripts. In other browsers, scripts will be
  queued and loaded one at a time to ensure correct execution order.

  @method load
  @param {String} type resource type ('css' or 'js')
  @param {String|Array} urls (optional) URL or array of URLs to load
  @param {Function} callback (optional) callback function to execute when the
    resource is loaded
  @param {Object} obj (optional) object to pass to the callback function
  @param {Object} context (optional) if provided, the callback function will
    be executed in this object's context
  @private
  */
  function load(type, urls, callback, obj, context) {
    var _finish = function () { finish(type); },
        isCSS   = type === 'css',
        nodes   = [],
        i, len, node, p, pendingUrls, url;

    env || getEnv();

    if (urls) {
      // If urls is a string, wrap it in an array. Otherwise assume it's an
      // array and create a copy of it so modifications won't be made to the
      // original.
      urls = typeof urls === 'string' ? [urls] : urls.concat();

      // Create a request object for each URL. If multiple URLs are specified,
      // the callback will only be executed after all URLs have been loaded.
      //
      // Sadly, Firefox and Opera are the only browsers capable of loading
      // scripts in parallel while preserving execution order. In all other
      // browsers, scripts must be loaded sequentially.
      //
      // All browsers respect CSS specificity based on the order of the link
      // elements in the DOM, regardless of the order in which the stylesheets
      // are actually downloaded.
      if (isCSS || env.async || env.gecko || env.opera) {
        // Load in parallel.
        queue[type].push({
          urls    : urls,
          callback: callback,
          obj     : obj,
          context : context
        });
      } else {
        // Load sequentially.
        for (i = 0, len = urls.length; i < len; ++i) {
          queue[type].push({
            urls    : [urls[i]],
            callback: i === len - 1 ? callback : null, // callback is only added to the last URL
            obj     : obj,
            context : context
          });
        }
      }
    }

    // If a previous load request of this type is currently in progress, we'll
    // wait our turn. Otherwise, grab the next item in the queue.
    if (pending[type] || !(p = pending[type] = queue[type].shift())) {
      return;
    }

    head || (head = doc.head || doc.getElementsByTagName('head')[0]);
    pendingUrls = p.urls.concat();

    for (i = 0, len = pendingUrls.length; i < len; ++i) {
      url = pendingUrls[i];

      if (isCSS) {
          node = env.gecko ? createNode('style') : createNode('link', {
            href: url,
            rel : 'stylesheet'
          });
      } else {
        node = createNode('script', {src: url});
        node.async = false;
      }

      node.className = 'lazyload';
      node.setAttribute('charset', 'utf-8');

      if (env.ie && !isCSS && 'onreadystatechange' in node && !('draggable' in node)) {
        node.onreadystatechange = function () {
          if (/loaded|complete/.test(node.readyState)) {
            node.onreadystatechange = null;
            _finish();
          }
        };
      } else if (isCSS && (env.gecko || env.webkit)) {
        // Gecko and WebKit don't support the onload event on link nodes.
        if (env.webkit) {
          // In WebKit, we can poll for changes to document.styleSheets to
          // figure out when stylesheets have loaded.
          p.urls[i] = node.href; // resolve relative URLs (or polling won't work)
          pollWebKit();
        } else {
          // In Gecko, we can import the requested URL into a <style> node and
          // poll for the existence of node.sheet.cssRules. Props to Zach
          // Leatherman for calling my attention to this technique.
          node.innerHTML = '@import "' + url + '";';
          pollGecko(node);
        }
      } else {
        node.onload = node.onerror = _finish;
      }

      nodes.push(node);
    }

    for (i = 0, len = nodes.length; i < len; ++i) {
      head.appendChild(nodes[i]);
    }
  }

  /**
  Begins polling to determine when the specified stylesheet has finished loading
  in Gecko. Polling stops when all pending stylesheets have loaded or after 10
  seconds (to prevent stalls).

  Thanks to Zach Leatherman for calling my attention to the @import-based
  cross-domain technique used here, and to Oleg Slobodskoi for an earlier
  same-domain implementation. See Zach's blog for more details:
  http://www.zachleat.com/web/2010/07/29/load-css-dynamically/

  @method pollGecko
  @param {HTMLElement} node Style node to poll.
  @private
  */
  function pollGecko(node) {
    var hasRules;

    try {
      // We don't really need to store this value or ever refer to it again, but
      // if we don't store it, Closure Compiler assumes the code is useless and
      // removes it.
      hasRules = !!node.sheet.cssRules;
    } catch (ex) {
      // An exception means the stylesheet is still loading.
      pollCount += 1;

      if (pollCount < 200) {
        setTimeout(function () { pollGecko(node); }, 50);
      } else {
        // We've been polling for 10 seconds and nothing's happened. Stop
        // polling and finish the pending requests to avoid blocking further
        // requests.
        hasRules && finish('css');
      }

      return;
    }

    // If we get here, the stylesheet has loaded.
    finish('css');
  }

  /**
  Begins polling to determine when pending stylesheets have finished loading
  in WebKit. Polling stops when all pending stylesheets have loaded or after 10
  seconds (to prevent stalls).

  @method pollWebKit
  @private
  */
  function pollWebKit() {
    var css = pending.css, i;

    if (css) {
      i = styleSheets.length;

      // Look for a stylesheet matching the pending URL.
      while (--i >= 0) {
        if (styleSheets[i].href === css.urls[0]) {
          finish('css');
          break;
        }
      }

      pollCount += 1;

      if (css) {
        if (pollCount < 200) {
          setTimeout(pollWebKit, 50);
        } else {
          // We've been polling for 10 seconds and nothing's happened, which may
          // indicate that the stylesheet has been removed from the document
          // before it had a chance to load. Stop polling and finish the pending
          // request to prevent blocking further requests.
          finish('css');
        }
      }
    }
  }

  return {

    /**
    Requests the specified CSS URL or URLs and executes the specified
    callback (if any) when they have finished loading. If an array of URLs is
    specified, the stylesheets will be loaded in parallel and the callback
    will be executed after all stylesheets have finished loading.

    @method css
    @param {String|Array} urls CSS URL or array of CSS URLs to load
    @param {Function} callback (optional) callback function to execute when
      the specified stylesheets are loaded
    @param {Object} obj (optional) object to pass to the callback function
    @param {Object} context (optional) if provided, the callback function
      will be executed in this object's context
    @static
    */
    css: function (urls, callback, obj, context) {
      load('css', urls, callback, obj, context);
    },

    /**
    Requests the specified JavaScript URL or URLs and executes the specified
    callback (if any) when they have finished loading. If an array of URLs is
    specified and the browser supports it, the scripts will be loaded in
    parallel and the callback will be executed after all scripts have
    finished loading.

    Currently, only Firefox and Opera support parallel loading of scripts while
    preserving execution order. In other browsers, scripts will be
    queued and loaded one at a time to ensure correct execution order.

    @method js
    @param {String|Array} urls JS URL or array of JS URLs to load
    @param {Function} callback (optional) callback function to execute when
      the specified scripts are loaded
    @param {Object} obj (optional) object to pass to the callback function
    @param {Object} context (optional) if provided, the callback function
      will be executed in this object's context
    @static
    */
    js: function (urls, callback, obj, context) {
      load('js', urls, callback, obj, context);
    }

  };
})(this.document);

define("lazyload", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.LazyLoad;
    };
}(this)));


define('text!../bower.json',[],function () { return '{\n  "name": "minnpost-elections-dashboard",\n  "version": "0.1.0",\n  "main": "index.html",\n  "ignore": [\n    "**/.*",\n    "node_modules",\n    "components",\n    "bower_components"\n  ],\n  "dependencies": {\n    "ractive": "~0.5.6",\n    "ractive-events-tap": "~0.1.1",\n    "requirejs": "~2.1.15",\n    "almond": "~0.3.0",\n    "text": "~2.0.12",\n    "underscore": "~1.7.0",\n    "jquery": "~1.11.1",\n    "minnpost-styles": "master",\n    "rgrove-lazyload": "*",\n    "backbone": "~1.1.2",\n    "leaflet": "0.7.3",\n    "momentjs": "~2.8.1",\n    "typeahead.js": "~0.10.4",\n    "Placeholders.js": "~3.0.0",\n    "ractive-backbone": "~0.1.1",\n    "moment-timezone": "~0.2.1",\n    "screenfull": "~1.2.1"\n  },\n  "dependencyMap": {\n    "requirejs": {\n      "rname": "requirejs",\n      "js": [\n        "requirejs/require"\n      ]\n    },\n    "almond": {\n      "rname": "almond",\n      "js": [\n        "almond/almond"\n      ]\n    },\n    "text": {\n      "rname": "text",\n      "js": [\n        "text/text"\n      ]\n    },\n    "jquery": {\n      "rname": "jquery",\n      "js": [\n        "jquery/dist/jquery"\n      ],\n      "returns": "$"\n    },\n    "underscore": {\n      "rname": "underscore",\n      "js": [\n        "underscore/underscore"\n      ],\n      "returns": "_"\n    },\n    "ractive": {\n      "rname": "ractive",\n      "js": [\n        "ractive/ractive-legacy"\n      ],\n      "returns": "Ractive"\n    },\n    "ractive-events-tap": {\n      "rname": "ractive-events-tap",\n      "js": [\n        "ractive-events-tap/ractive-events-tap"\n      ],\n      "returns": "RactiveEventsTap"\n    },\n    "ractive-backbone": {\n      "rname": "ractive-backbone",\n      "js": [\n        "ractive-backbone/ractive-backbone"\n      ],\n      "returns": "RactiveBackbone"\n    },\n    "leaflet": {\n      "rname": "leaflet",\n      "js": [\n        "leaflet/dist/leaflet-src"\n      ],\n      "css": [\n        "leaflet/dist/leaflet"\n      ],\n      "images": [\n        "leaflet/dist/images"\n      ],\n      "returns": "L"\n    },\n    "momentjs": {\n      "rname": "moment",\n      "js": [\n        "momentjs/moment"\n      ],\n      "returns": "moment"\n    },\n    "moment-timezone": {\n      "rname": "moment-timezone",\n      "js": [\n        "moment-timezone/builds/moment-timezone-with-data"\n      ],\n      "returns": "momentTimezone"\n    },\n    "Placeholders.js": {\n      "rname": "placeholders-js",\n      "js": [\n        "Placeholders.js/build/placeholders.jquery"\n      ],\n      "returns": "placeholders"\n    },\n    "typeahead.js": {\n      "rname": "typeahead-js",\n      "js": [\n        "typeahead.js/dist/typeahead.jquery"\n      ],\n      "returns": "typeahead"\n    },\n    "bloodhound": {\n      "rname": "bloodhound",\n      "js": [\n        "typeahead.js/dist/bloodhound"\n      ],\n      "returns": "Bloodhound"\n    },\n    "screenfull": {\n      "rname": "screenfull",\n      "js": [\n        "screenfull/dist/screenfull"\n      ],\n      "returns": "screenfull"\n    },\n    "minnpost-styles": {\n      "rname": "mpStyles",\n      "css": [\n        "//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css",\n        "minnpost-styles/dist/minnpost-styles"\n      ],\n      "sass": [\n        "minnpost-styles/styles/main"\n      ]\n    },\n    "mpConfig": {\n      "rname": "mpConfig",\n      "js": [\n        "minnpost-styles/dist/minnpost-styles.config"\n      ],\n      "returns": "mpConfig"\n    },\n    "mpFormatters": {\n      "rname": "mpFormatters",\n      "js": [\n        "minnpost-styles/dist/minnpost-styles.formatters"\n      ],\n      "returns": "mpFormatters"\n    },\n    "mpMaps": {\n      "rname": "mpMaps",\n      "js": [\n        "minnpost-styles/dist/minnpost-styles.maps"\n      ],\n      "returns": "mpMaps"\n    }\n  }\n}\n';});

/**
 * Base class(es) for applications.
 */

// Create main application
define('base',['jquery', 'underscore', 'backbone', 'lazyload', 'mpFormatters', 'text!../bower.json'],
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

/**
 * Models
 */
define('models',[
  'jquery', 'underscore', 'backbone', 'moment', 'moment-timezone', 'helpers'
], function($, _, Backbone, moment, momentTimezone, helpers) {
  var models = {};

  models.ContestModel = Backbone.Model.extend({
    // Base query for the contest
    query: "SELECT r.*, c.* FROM contests AS c LEFT JOIN results AS r " +
      "ON c.id = r.contest_id WHERE c.id = '%CONTEST_ID%' " +
      "ORDER BY r.percentage ASC, r.candidate",

    // Fields that are for contests (not result)
    contestFields: ['id', 'contest_id', 'boundary', 'county_id', 'district_code',
    'office_id', 'precinct_id', 'precincts_reporting', 'question_body',
    'ranked_choice', 'results_group', 'seats', 'state', 'title', 'sub_title',
    'total_effected_precincts', 'total_votes_for_office', 'updated',
    'question_body', 'question_help', 'primary', 'scope', 'partisan', 'incumbent_party', 'percent_needed', 'called'],

    // Non-Partisan parties
    npParties: ['NP', 'WI'],

    // Initializer
    initialize: function(model, options) {
      this.options = options || {};
      this.app = options.app;

      // Changes that should come in from the API
      this.on('sync', this.contestUpdate);
    },

    // Construct API call
    url: function() {
      return this.app.options.electionsAPI +
        encodeURIComponent(this.query.replace('%CONTEST_ID%', this.id));
    },

    // Parse results
    parse: function(response, options) {
      var thisModel = this;
      var parsed = {};
      var rankedChoiceFinal = false;
      parsed.results = [];

      // Given how collections process fetching new data, we want to avoid
      // parsing here and parse on the collection part
      if (options.collection) {
        return response;
      }

      // Separate out what is contest level properties and what is
      // results
      _.each(response, function(r) {
        var result = {};
        _.each(r, function(v, k) {
          if (_.indexOf(thisModel.contestFields, k) >= 0) {
            parsed[k] = v;
          }
          else {
            result[k] = v;
          }
        });
        parsed.results.push(result);
      });

      // Ranked choice handling.  Group each candidate and add array
      // for results per rank
      if (parsed.ranked_choice) {
        var groupedResults = {};
        _.each(parsed.results, function(r) {
          var c = r.ranked_choice_place;
          groupedResults[r.candidate_id] = groupedResults[r.candidate_id] || {};
          groupedResults[r.candidate_id].ranked_choices = groupedResults[r.candidate_id].ranked_choices || {};
          groupedResults[r.candidate_id].ranked_choices[c] = {
            'ranked_choice': c,
            'percentage': r.percentage,
            'votes_candidate': r.votes_candidate,
            'office_name': r.office_name
          };

          // If the first choice, use this information to fill in results
          if (c === 1) {
            groupedResults[r.candidate_id] = _.extend(groupedResults[r.candidate_id], r);
          }

          // If the final choice, get some values
          if (c === 100) {
            groupedResults[r.candidate_id].percentage = r.percentage;
            groupedResults[r.candidate_id].votes_candidate = r.votes_candidate;
          }
        });
        parsed.results = _.values(groupedResults);
      }

      // Put results in a basic order.
      parsed.results = _.sortBy(parsed.results, 'candidate');
      parsed.results = _.sortBy(parsed.results, function(r) {
        return r.votes_candidate * -1;
      });
      // If primary, sort by party
      if (parsed.primary) {
        parsed.results = _.sortBy(parsed.results, 'party_id');
      }

      // Mark who won.  Overall having all precincts reporting is good
      // enough but with ranked choice, we need have all the final data
      // in.  Primaries need to choose winners per parties
      parsed.done = (parsed.precincts_reporting === parsed.total_effected_precincts);

      // Get ranked choice final results
      if (parsed.ranked_choice) {
        rankedChoiceFinal = (_.size(parsed.results) == _.size(_.filter(parsed.results, function(r) {
          return (!_.isUndefined(r.ranked_choices[100]));
        })));
      }

      // If there is a percent needed option.  We assume yes no questions
      if (parsed.percent_needed && parsed.percent_needed > 0 && parsed.done) {
        parsed.results = _.map(parsed.results, function(r, ri) {
          r.winner = false;
          if (r.candidate.toLowerCase() === 'yes' &&
            r.percentage >= parsed.percent_needed) {
            r.winner = true;
          }
          else if (r.candidate.toLowerCase() === 'no' &&
            r.percentage > (100 - parsed.percent_needed)) {
            r.winner = true;
          }
          return r;
        });
      }
      // Conditions where we just want the top seats
      else if ((parsed.done && !parsed.ranked_choice && !parsed.primary) ||
        (parsed.done && parsed.ranked_choice && rankedChoiceFinal && !parsed.primary) ||
        (parsed.done && parsed.primary && !parsed.partisan)) {
        parsed.results = _.map(parsed.results, function(r, ri) {
          r.winner = false;
          if (ri < parsed.seats && !r.percent) {
            r.winner = true;
          }
          return r;
        });
        parsed.final = true;
      }

      // If primary and partisan race
      else if (parsed.done && parsed.primary && parsed.partisan) {
        _.each(_.groupBy(parsed.results, 'party_id'), function(p, pi) {
          _.each(p, function(r, ri) {
            r.winner = false;
            if (ri < parsed.seats) {
              r.winner = true;
            }
            return r;
          });
        });

        parsed.final = true;
      }

      // Further formatting
      parsed.updated = moment.unix(parsed.updated);
      return parsed;
    },

    // When data comes is, handle it
    contestUpdate: function() {
      this.set('synced', true);

      // Only handle once
      if (!this.get('fetchedBoundary') && _.isString(this.get('boundary'))) {
        this.fetchBoundary();
      }
    },

    // Gets boundary data from boundary service.  Unfortunately
    // some contests have multiple boundaries (issue with the
    // original boundary datasets)
    fetchBoundary: function() {
      var thisModel = this;

      thisModel.set('boundarySets', []);
      boundaries = [this.get('boundary')];
      if (boundaries[0].includes(",")) {
        boundaries = boundaries[0].split(",");
      }

      _.each(boundaries, function(b){
        helpers.jsonpRequest({
          url: thisModel.app.options.boundaryAPI + 'boundaries/' + encodeURIComponent(b) + '/simple_shape'
        }, thisModel.app.options)
        .done(function(response) {
          if (response) {
            boundarySets = thisModel.get('boundarySets');
            boundarySets.push({'slug': b, 'simple_shape': response});
            thisModel.set('boundarySets', boundarySets);
            if (boundarySets.length == boundaries.length) {
              thisModel.set('fetchedBoundary', true);
            }
          }
        });
      });

    },

    // Our API is pretty simple, so we do a basic time based
    // polling.  Call right away as well.
    connect: function(fetchBoundary) {
      var thisModel = this;

      // Allow to turn off boundary fetching
      this.set('fetchedBoundary', (fetchBoundary !== false) ? false : true);

      this.fetch();
      this.pollID = window.setInterval(function() {
        thisModel.fetch();
      }, this.app.options.electionsAPIPollInterval);
    },

    // Stop the polling
    disconnect: function() {
      window.clearInterval(this.pollID);
    }
  });


  // Model for election wide data
  models.ElectionModel = Backbone.Model.extend({
    // Base query for the metadata
    query: "SELECT * FROM meta",

    // Initializer
    initialize: function(model, options) {
      this.options = options || {};
      this.app = options.app;
    },

    // Construct API call
    url: function() {
      return this.app.options.electionsAPI +
        encodeURIComponent(this.query);
    },

    // Parse results
    parse: function(response, options) {
      var parsed = {};
      var now, testStop;

      // Parse out values
      _.each(response, function(r, ri) {
        // Parsing large ints in JS :(
        if (r.type === 'int') {
          parsed[r.key] = parseInt(r.value, 10);
        }
        else if (r.type === 'float') {
          parsed[r.key] = parseFloat(r.value);
        }
        else if (r.type === 'bool') {
          parsed[r.key] = !!r.value;
        }
        else {
          parsed[r.key] = r.value.toString();
        }
      });

      // Some specifics
      if (parsed.date) {
        parsed.date = moment(parsed.date);
      }
      if (parsed.updated) {
        parsed.updated = moment.unix(parsed.updated);
      }

      // If we have a date for the election, make a good guess on whether
      // we are looking at test results.  Unofficialy, the numbers should
      // be zeroed by 3pm
      parsed.isTest = false;
      if (parsed.date) {
        now = moment().tz('America/Chicago');
        testStop = parsed.date.clone();
        testStop.tz('America/Chicago').hour(15).minute(0);
        if (now.isBefore(testStop, 'minute')) {
          parsed.isTest = true;
        }
      }
      return parsed;
    },

    // Our API is pretty simple, so we do a basic time based
    // polling.  Call right away as well.
    connect: function() {
      var thisModel = this;
      this.fetch();
      this.pollID = window.setInterval(function() {
        thisModel.fetch();
      }, this.app.options.electionsAPIPollInterval);
    },

    // Stop the polling
    disconnect: function() {
      window.clearInterval(this.pollID);
    }
  });


  // General model for connecting for custom queries
  models.CustomQuery = Backbone.Model.extend({
    // Example quqery
    query: "SELECT * FROM results LIMIT 10",

    // Initializer
    initialize: function(model, options) {
      this.options = options || {};
      this.app = options.app;
      this.query = options.query || this.query;
      this.parse = (options.parse) ? _.bind(options.parse, this) : this.parse;
    },

    // Construct API call
    url: function() {
      return this.app.options.electionsAPI +
        encodeURIComponent(this.query);
    },

    // Default parse
    parse: function(response, options) {
      return response;
    },

    // Our API is pretty simple, so we do a basic time based
    // polling.  Call right away as well.
    connect: function() {
      var thisModel = this;
      this.fetch();
      this.pollID = window.setInterval(function() {
        thisModel.fetch();
      }, this.app.options.electionsAPIPollInterval);
    },

    // Stop the polling
    disconnect: function() {
      window.clearInterval(this.pollID);
    }
  });


  return models;

});

/**
 * Collections
 */
define('collections',[
  'jquery', 'underscore', 'backbone', 'models', 'helpers'
], function($, _, Backbone, models, helpers) {

  var collections = {};

  collections.ContestsCollection = Backbone.Collection.extend({
    model: models.ContestModel,

    // Base query for the contest
    query: "SELECT r.*, c.* FROM contests AS c LEFT JOIN results AS r " +
      "ON c.id = r.contest_id WHERE (%CONTEST_SEARCH%) " +
      "ORDER BY c.title, r.percentage, r.candidate ASC LIMIT 400",

    // Construct API call
    url: function() {
      var filter = '';
      var searches = this.options.search.split('|');
      searches = _.map(searches, function(s) {
        s = s.split(' ').join('%');
        s = s.split('+').join('%');
        return "title LIKE '%" + s + "%' OR sub_title LIKE '%" + s + "%'";
      });

      return this.app.options.electionsAPI +
        encodeURIComponent(this.query.replace('%CONTEST_SEARCH%', searches.join(' OR ')));
    },

    // Parse the results.
    parse: function(response, options) {
      // How backbone handles parsing is not helpful given our structure; it'll
      // pass the model-level parsing but only after it has looked to see if
      // the model should be added or updated to the collection.  So, we do
      // parsing here and avoid it on the model.  Luckily backbone passes
      // a 'collection' option to check for.
      var parsed = _.map(_.values(_.groupBy(response, 'id')),
        this.model.prototype.parse, this.model.prototype);
      return parsed;
    },

    initialize: function(models, options) {
      this.options = options || {};
      this.app = options.app;

      // Add references to options and app
      this.on('add', function(m) {
        m.options = options;
        m.app = options.app;
      });
      // When data comes in, react
      this.on('sync', function() {
        this.contestUpdate();
      });
    },

    // When data comes is, handle it
    contestUpdate: function() {
      // Only handle once
      if (!this.fetchedBoundary) {
        this.fetchBoundary();
      }
    },

    // Gets boundary data from boundary service.
    fetchBoundary: function() {
      var thisCollection = this;

      thisCollection.each(function(m){
        m.set('boundarySets', []);
        boundaries = [m.get('boundary')];
        if (boundaries[0].includes(",")) {
          boundaries = boundaries[0].split(",");
        }
        m.set('totalBoundaryCount', boundaries.length);
        
        _.each(boundaries, function(b){
          helpers.jsonpRequest({
            url: thisCollection.app.options.boundaryAPI + 'boundaries/' + encodeURIComponent(b) + '/simple_shape'
          }, thisCollection.app.options)
          .done(function(response) {
            if (response) {
              boundarySets = m.get('boundarySets');
              boundarySets.push({'slug': b, 'simple_shape': response});
              m.set('boundarySets', boundarySets);
              if (boundarySets.length == m.get('totalBoundaryCount')) {
                m.set('fetchedBoundary', true);
              }
            }
          });
        });

      });

    },

    // Our API is pretty simple, so we do a basic time based
    // polling.  Call right away as well.
    connect: function() {
      var thisCollection = this;
      var fetchOptions = { collection: true };

      this.fetch(fetchOptions);
      this.pollID = window.setInterval(function() {
        thisCollection.fetch(fetchOptions);
      }, this.app.options.electionsAPIPollInterval);
    },

    // Stop the polling
    disconnect: function() {
      window.clearInterval(this.pollID);
    }
  });

  // A collection based a location
  collections.ContestsLocationCollection = collections.ContestsCollection.extend({

    // Base query for the contest
    query: "SELECT r.*, c.* FROM contests AS c LEFT JOIN results AS r " +
      "ON c.id = r.contest_id WHERE boundary IN (%CONTEST_SEARCH%) " +
      "ORDER BY c.title, r.percentage, r.candidate ASC LIMIT 400",

    // Construct API call
    url: function() {
      return this.app.options.electionsAPI +
        encodeURIComponent(this.query.replace('%CONTEST_SEARCH%',
          "'" + this.boundaries.join("','") + "'"));
    },

    initialize: function(models, options) {
      // Call parent intializer
      collections.ContestsLocationCollection.__super__.initialize.apply(this, arguments);

      this.on('fetchedBoundary', function() {
        this.connect();
      });
    },

    // Override this, as we actually get the boundaries first
    contestUpdate: function() {
      // Only handle once
      if (!this.matchedBoundary) {
        this.matchBoundary();
      }
    },

    // Match the already recieved boundaries
    matchBoundary: function() {
      var thisCollection = this;
      _.each(this.fullBoundaries, function(b) {
        var parts = b.url.split("/");
        var slug = parts[2] + "/" + parts[3];
        _.each(thisCollection.where({ boundary: slug }), function(m) {
          helpers.jsonpRequest({
            url: thisCollection.app.options.boundaryAPI + "boundaries/" + slug + '/simple_shape'
          }, thisCollection.app.options)
          .done(function(response){
            m.set('boundarySets', [{'slug': slug, 'simple_shape': response}]);
            m.set('fetchedBoundary', true);
          });
        });
      });

      this.matchedBoundary = true;
    },

    // Get Bundaries from coordinates
    fetchBoundaryFromCoordinates: function() {
      var thisCollection = this;

      //This lookup is for all the jurisdictions with contests this year that
      //consist of multiple boundaries
      multiMCDs = {"minor-civil-divisions-2010/2704904798": "minor-civil-divisions-2010/2704904798,minor-civil-divisions-2010/2715704798", "minor-civil-divisions-2010/2715704798": "minor-civil-divisions-2010/2704904798,minor-civil-divisions-2010/2715704798", "minor-civil-divisions-2010/2700306382": "minor-civil-divisions-2010/2700306382,minor-civil-divisions-2010/2712306382", "minor-civil-divisions-2010/2712306382": "minor-civil-divisions-2010/2700306382,minor-civil-divisions-2010/2712306382", "minor-civil-divisions-2010/2705907282": "minor-civil-divisions-2010/2705907282,minor-civil-divisions-2010/2706507282", "minor-civil-divisions-2010/2706507282": "minor-civil-divisions-2010/2705907282,minor-civil-divisions-2010/2706507282", "minor-civil-divisions-2010/2712108092": "minor-civil-divisions-2010/2712108092,minor-civil-divisions-2010/2714508092", "minor-civil-divisions-2010/2714508092": "minor-civil-divisions-2010/2712108092,minor-civil-divisions-2010/2714508092", "minor-civil-divisions-2010/2710909154": "minor-civil-divisions-2010/2710909154,minor-civil-divisions-2010/2710909154", "minor-civil-divisions-2010/2701910918": "minor-civil-divisions-2010/2701910918,minor-civil-divisions-2010/2705310918", "minor-civil-divisions-2010/2705310918": "minor-civil-divisions-2010/2701910918,minor-civil-divisions-2010/2705310918",  "minor-civil-divisions-2010/2704511008": "minor-civil-divisions-2010/2704511008,minor-civil-divisions-2010/2710911008", "minor-civil-divisions-2010/2710911008": "minor-civil-divisions-2010/2704511008,minor-civil-divisions-2010/2710911008", "minor-civil-divisions-2010/2714511800": "minor-civil-divisions-2010/2714511800,minor-civil-divisions-2010/2717111800", "minor-civil-divisions-2010/2717111800": "minor-civil-divisions-2010/2714511800,minor-civil-divisions-2010/2717111800", "minor-civil-divisions-2010/2701512772": "minor-civil-divisions-2010/2701512772,minor-civil-divisions-2010/2703312772", "minor-civil-divisions-2010/2703312772": "minor-civil-divisions-2010/2701512772,minor-civil-divisions-2010/2703312772", "minor-civil-divisions-2010/2705315022": "minor-civil-divisions-2010/2705315022,minor-civil-divisions-2010/2717115022", "minor-civil-divisions-2010/2717115022": "minor-civil-divisions-2010/2705315022,minor-civil-divisions-2010/2717115022", "minor-civil-divisions-2010/2704915706": "minor-civil-divisions-2010/2704915706,minor-civil-divisions-2010/2713115706", "minor-civil-divisions-2010/2713115706": "minor-civil-divisions-2010/2704915706,minor-civil-divisions-2010/2713115706", "minor-civil-divisions-2010/2709318134": "minor-civil-divisions-2010/2709318134,minor-civil-divisions-2010/2714518134", "minor-civil-divisions-2010/2714518134": "minor-civil-divisions-2010/2709318134,minor-civil-divisions-2010/2714518134", "minor-civil-divisions-2010/2707919160": "minor-civil-divisions-2010/2707919160,minor-civil-divisions-2010/2716119160", "minor-civil-divisions-2010/2716119160": "minor-civil-divisions-2010/2707919160,minor-civil-divisions-2010/2716119160", "minor-civil-divisions-2010/2702325280": "minor-civil-divisions-2010/2702325280,minor-civil-divisions-2010/2717325280", "minor-civil-divisions-2010/2717325280": "minor-civil-divisions-2010/2702325280,minor-civil-divisions-2010/2717325280", "minor-civil-divisions-2010/2705326990": "minor-civil-divisions-2010/2705326990,minor-civil-divisions-2010/2717126990", "minor-civil-divisions-2010/2717126990": "minor-civil-divisions-2010/2705326990,minor-civil-divisions-2010/2717126990", "minor-civil-divisions-2010/2711731760": "minor-civil-divisions-2010/2711731760,minor-civil-divisions-2010/2713331760", "minor-civil-divisions-2010/2713331760": "minor-civil-divisions-2010/2711731760,minor-civil-divisions-2010/2713331760", "minor-civil-divisions-2010/2705533866": "minor-civil-divisions-2010/2705533866,minor-civil-divisions-2010/2716933866", "minor-civil-divisions-2010/2716933866": "minor-civil-divisions-2010/2705533866,minor-civil-divisions-2010/2716933866", "minor-civil-divisions-2010/2704934172": "minor-civil-divisions-2010/2704934172,minor-civil-divisions-2010/2715734172", "minor-civil-divisions-2010/2715734172": "minor-civil-divisions-2010/2704934172,minor-civil-divisions-2010/2715734172", "minor-civil-divisions-2010/2707936746": "minor-civil-divisions-2010/2707936746,minor-civil-divisions-2010/2714336746", "minor-civil-divisions-2010/2714336746": "minor-civil-divisions-2010/2707936746,minor-civil-divisions-2010/2714336746", "minor-civil-divisions-2010/2715743036": "minor-civil-divisions-2010/2715743036,minor-civil-divisions-2010/2716943036", "minor-civil-divisions-2010/2716943036": "minor-civil-divisions-2010/2715743036,minor-civil-divisions-2010/2716943036", "minor-civil-divisions-2010/2701343198": "minor-civil-divisions-2010/2701343198,minor-civil-divisions-2010/2704343198", "minor-civil-divisions-2010/2704343198": "minor-civil-divisions-2010/2701343198,minor-civil-divisions-2010/2704343198", "minor-civil-divisions-2010/2702144422": "minor-civil-divisions-2010/2702144422,minor-civil-divisions-2010/2709744422", "minor-civil-divisions-2010/2709744422": "minor-civil-divisions-2010/2702144422,minor-civil-divisions-2010/2709744422", "minor-civil-divisions-2010/2707945808": "minor-civil-divisions-2010/2707945808,minor-civil-divisions-2010/2713945808", "minor-civil-divisions-2010/2713945808": "minor-civil-divisions-2010/2707945808,minor-civil-divisions-2010/2713945808", "minor-civil-divisions-2010/2703746924": "minor-civil-divisions-2010/2703746924,minor-civil-divisions-2010/2713146924", "minor-civil-divisions-2010/2713146924": "minor-civil-divisions-2010/2703746924,minor-civil-divisions-2010/2713146924", "minor-civil-divisions-2010/2701347068": "minor-civil-divisions-2010/2701347068,minor-civil-divisions-2010/2710347068", "minor-civil-divisions-2010/2710347068": "minor-civil-divisions-2010/2701347068,minor-civil-divisions-2010/2710347068", "minor-civil-divisions-2010/2709148562": "minor-civil-divisions-2010/2709148562,minor-civil-divisions-2010/2716548562", "minor-civil-divisions-2010/2716548562": "minor-civil-divisions-2010/2709148562,minor-civil-divisions-2010/2716548562", "minor-civil-divisions-2010/2704148796": "minor-civil-divisions-2010/2704148796,minor-civil-divisions-2010/2715348796", "minor-civil-divisions-2010/2715348796": "minor-civil-divisions-2010/2704148796,minor-civil-divisions-2010/2715348796", "minor-civil-divisions-2010/2704951136": "minor-civil-divisions-2010/2704951136,minor-civil-divisions-2010/2710951136", "minor-civil-divisions-2010/2710951136": "minor-civil-divisions-2010/2704951136,minor-civil-divisions-2010/2710951136", "minor-civil-divisions-2010/2709552522": "minor-civil-divisions-2010/2709552522,minor-civil-divisions-2010/2714152522", "minor-civil-divisions-2010/2714152522": "minor-civil-divisions-2010/2709552522,minor-civil-divisions-2010/2714152522", "minor-civil-divisions-2010/2712753656": "minor-civil-divisions-2010/2712753656,minor-civil-divisions-2010/2712953656", "minor-civil-divisions-2010/2712953656": "minor-civil-divisions-2010/2712753656,minor-civil-divisions-2010/2712953656", "minor-civil-divisions-2010/2705355006": "minor-civil-divisions-2010/2705355006,minor-civil-divisions-2010/2717155006", "minor-civil-divisions-2010/2717155006": "minor-civil-divisions-2010/2705355006,minor-civil-divisions-2010/2717155006", "minor-civil-divisions-2010/2707755438": "minor-civil-divisions-2010/2707755438,minor-civil-divisions-2010/2713555438", "minor-civil-divisions-2010/2713555438": "minor-civil-divisions-2010/2707755438,minor-civil-divisions-2010/2713555438", "minor-civil-divisions-2010/2711156014": "minor-civil-divisions-2010/2711156014,minor-civil-divisions-2010/2716756014", "minor-civil-divisions-2010/2716756014": "minor-civil-divisions-2010/2711156014,minor-civil-divisions-2010/2716756014", "minor-civil-divisions-2010/2700956176": "minor-civil-divisions-2010/2700956176,minor-civil-divisions-2010/2709756176", "minor-civil-divisions-2010/2709756176": "minor-civil-divisions-2010/2700956176,minor-civil-divisions-2010/2709756176", "minor-civil-divisions-2010/2700356950": "minor-civil-divisions-2010/2700356950,minor-civil-divisions-2010/2705956950", "minor-civil-divisions-2010/2705956950": "minor-civil-divisions-2010/2700356950,minor-civil-divisions-2010/2705956950", "minor-civil-divisions-2010/2700958612": "minor-civil-divisions-2010/2700958612,minor-civil-divisions-2010/2714558612", "minor-civil-divisions-2010/2714558612": "minor-civil-divisions-2010/2700958612,minor-civil-divisions-2010/2714558612", "minor-civil-divisions-2010/2701960016": "minor-civil-divisions-2010/2701960016,minor-civil-divisions-2010/2705360016", "minor-civil-divisions-2010/2705360016": "minor-civil-divisions-2010/2701960016,minor-civil-divisions-2010/2705360016", "minor-civil-divisions-2010/2700361996": "minor-civil-divisions-2010/2700361996,minor-civil-divisions-2010/2712361996", "minor-civil-divisions-2010/2712361996": "minor-civil-divisions-2010/2700361996,minor-civil-divisions-2010/2712361996", "minor-civil-divisions-2010/2715362446": "minor-civil-divisions-2010/2715362446,minor-civil-divisions-2010/2715962446", "minor-civil-divisions-2010/2715962446": "minor-civil-divisions-2010/2715362446,minor-civil-divisions-2010/2715962446", "minor-civil-divisions-2010/2709763778": "minor-civil-divisions-2010/2709763778,minor-civil-divisions-2010/2715363778", "minor-civil-divisions-2010/2715363778": "minor-civil-divisions-2010/2709763778,minor-civil-divisions-2010/2715363778", "minor-civil-divisions-2010/2711167504": "minor-civil-divisions-2010/2711167504,minor-civil-divisions-2010/2715967504", "minor-civil-divisions-2010/2715967504": "minor-civil-divisions-2010/2711167504,minor-civil-divisions-2010/2715967504", "minor-civil-divisions-2010/2701339878": "minor-civil-divisions-2010/2701339878,minor-civil-divisions-2010/2707939878,minor-civil-divisions-2010/2710339878", "minor-civil-divisions-2010/2707939878": "minor-civil-divisions-2010/2701339878,minor-civil-divisions-2010/2707939878, minor-civil-divisions-2010/2710339878", "minor-civil-divisions-2010/2710339878": "minor-civil-divisions-2010/2701339878,minor-civil-divisions-2010/2707939878,minor-civil-divisions-2010/2710339878", "minor-civil-divisions-2010/2700956896": "minor-civil-divisions-2010/2700956896,minor-civil-divisions-2010/2714156896,minor-civil-divisions-2010/2714556896", "minor-civil-divisions-2010/2714156896": "minor-civil-divisions-2010/2700956896,minor-civil-divisions-2010/2714156896, minor-civil-divisions-2010/2714556896", "minor-civil-divisions-2010/2714556896": "minor-civil-divisions-2010/2700956896,minor-civil-divisions-2010/2714156896,minor-civil-divisions-2010/2714556896"};

      helpers.jsonpRequest({
        url: this.app.options.boundaryAPI + 'boundaries/?contains=' +
          encodeURIComponent(this.options.lonlat[1]) + ',' +
          encodeURIComponent(this.options.lonlat[0]) + '&sets=' +
          encodeURIComponent(this.app.options.boundarySets.join(','))
      }, this.app.options)
      .done(function(response) {
        if (_.isArray(response.objects)) {
          thisCollection.fullBoundaries = response.objects;
          var slugs = [];
          _.each(response.objects, function(r) {
            var parts = r.url.split("/");
            var slug = parts[2] + "/" + parts[3];
            slug = (multiMCDs[slug]) ? multiMCDs[slug] : slug; //Replace slug if part of multi-part MCD
            slugs.push(slug);
          });
          thisCollection.boundaries = slugs;
          thisCollection.trigger('fetchedBoundary');
        }
      });
    }
  });

  return collections;

});


define('text!templates/application.mustache',[],function () { return '\n\n<a href="#"\n  on-tap="toggleFullscreen"\n  class="fullscreen-toggle"\n  title="{{^isFullscreen}}Enable{{/isFullscreen}}{{#isFullscreen}}Disable{{/isFullscreen}} fullscreen">\n  <i class="fa {{^isFullscreen}}fa-expand{{/isFullscreen}}{{#isFullscreen}}fa-compress{{/isFullscreen}}"></i>\n</a>\n\n<div class="fullscreen-overlay"></div>\n\n<div class="message-container">\n</div>\n\n<div class="content-container">\n</div>\n\n<div class="footnote-container">\n</div>\n';});


define('text!templates/footnote.mustache',[],function () { return '<div class="footnote">\n  <p>Unofficial election data provided by the <a href="http://www.sos.state.mn.us/" target="_blank">MN Secretary of State</a>.  For ranked-choice contests data is supplemented manually with data from the respective jurisdictions.  Test data will be provided until 8PM on Election Night.</p>\n\n  <p>The geographical boundaries, though received from official sources and queried from our <a href="https://represent-minnesota.herokuapp.com" target="_blank">boundary service</a>, may not represent the exact, offical area for a contest, race, or election.  It is also possible that for a given location the contests may not be accurate due to data quality with multiple agencies.  Please refer to your local and state election officials to know exactly what contests happen for a given location.</p>\n\n  <p>Some map data © OpenStreetMap contributors; licensed under the <a href="http://www.openstreetmap.org/copyright" target="_blank">Open Data Commons Open Database License</a>.  Some map design © MapBox; licensed according to the <a href="http://mapbox.com/tos/" target="_blank">MapBox Terms of Service</a>.  Location geocoding provided by <a href="http://www.mapquest.com/" target="_blank">Mapquest</a> and is not guaranteed to be accurate.</p>\n\n  <p>This application was designed and built by Alan Palazzolo, Kaeti Hinck and Tom Nehil. Some code, techniques, and data on <a href="https://github.com/minnpost/minnpost-elections-dashboard" target="_blank">Github</a>.</p>\n</div>\n';});


define('text!templates/contest.mustache',[],function () { return '<div class="contest {{#isDashboard}}dashboard-contest{{/isDashboard}} {{ classes }} {{#(ranked_choice == 1)}}is-ranked-choice {{/()}} {{#(final === true)}}is-final{{/()}} {{#primary}}primary{{/primary}} contest-{{id}}">\n  {{^isDashboard}}\n    <a class="dashboard-link" href="#dashboard">&larr; Back to dashboard</a>\n  {{/isDashboard}}\n\n  <div>\n    {{#((results.length == 0 || results == undefined) && !synced)}}\n      {{>loading}}\n    {{/()}}\n  </div>\n\n  {{#((results.length == 0 || results == undefined) && synced)}}\n    <h3>Did not find any contests</h3>\n  {{/()}}\n\n\n  {{#((results.length > 0) && synced)}}\n    <h3>\n      {{#(customTitle != undefined)}}{{ customTitle }}{{/()}}\n      {{#(customTitle == undefined)}}{{ title }}{{/()}}\n      {{#(show_party != undefined)}}<span class="show-party party-label bg-color-political-{{ show_party.toLowerCase() }}" title="{{ parties[show_party.toLowerCase()] }}">{{ show_party }}</span>{{/()}}\n    </h3>\n\n    {{#sub_title}}\n      <h5>{{ sub_title }}</h5>\n    {{/sub_title}}\n\n    {{^isDashboard}}\n      <div class="last-updated">Last updated {{ updated.formatToday() }}</div>\n    {{/isDashboard}}\n\n    {{#(!!question_body)}}\n      <p>{{{ question_body }}}</p>\n    {{/()}}\n\n    {{#percent_needed}}\n      <p><em>This contest requires {{ formatters.number(percent_needed, 1) }}% or more "yes" votes for the measure to pass.</em></p>\n    {{/percent_needed}}\n  {{/()}}\n\n  <div class="{{^isDashboard}}row{{/isDashboard}}">\n    <div class="{{^isDashboard}}column-medium-70 inner-column-left{{/isDashboard}}">\n      <div class="">\n        <table class="striped">\n          <thead>\n            <tr class="table-first-heading">\n              <th class="winner-column"></th>\n              <th>Candidate</th>\n              {{#(partisan && show_party === undefined)}}\n                <th>\n                  <span class="large-table-label">Party</span>\n                  <span class="small-table-label"></span>\n                </th>\n              {{/()}}\n              {{#(ranked_choice == 1)}}\n                <th class="first-choice-column">Results</th>\n                <th class="second-choice-column"></th>\n                <th class="third-choice-column"></th>\n                <th class="final-column">Final</th>\n              {{/()}}\n              {{#(ranked_choice != 1)}}\n                {{^isDashboard}}\n                  <th class="percentage">\n                    <span class="large-table-label">Percentage</span>\n                    <span class="small-table-label">%</span>\n                  </th>\n                  <th class="votes">Votes</th>\n                {{/isDashboard}}\n                {{#isDashboard}}\n                  <th class="percentage">Results</th>\n                {{/isDashboard}}\n              {{/()}}\n            </tr>\n            <tr class="table-second-heading">\n              <th class="winner-column"></th>\n              <th>{{ precincts_reporting }} of {{ total_effected_precincts }} precincts reporting.  {{#(seats > 1)}}Choosing {{ seats }}.{{/()}}</th>\n              {{#(partisan && show_party === undefined)}}\n                <th></th>\n              {{/()}}\n              {{#(ranked_choice == 1)}}\n                <th class="first-choice-column first-choice-heading">1st choice</th>\n                <th class="second-choice-column second-choice-heading">2nd choice</th>\n                <th class="third-choice-column third-choice-heading">3rd choice</th>\n                <th class="final-column"></th>\n              {{/()}}\n              {{#(ranked_choice != 1)}}\n                <th></th>\n                {{^isDashboard}}\n                  <th></th>\n                {{/isDashboard}}\n              {{/()}}\n            </tr>\n          </thead>\n\n          <tbody>\n            {{#results:r}} {{#(!isDashboard || ((show_party == undefined && (r < 2 || (rows != undefined && r < rows))) || (show_party && party_id == show_party)))}}\n              <tr data-row-id="{{ id }}" class="{{ (r % 2 === 0) ? \'even\' : \'odd\' }} {{#primary}}{{ party_id.toLowerCase() }}{{/primary}}">\n                <td class="winner-column">{{#(winner && called === "TRUE")}}<span class="fa fa-check"></span>{{/())}}</td>\n\n                <td class="candidate-column">{{ candidate }}</td>\n\n                {{#(partisan && show_party === undefined)}}\n                  <td>\n                    {{#([\'WI\', \'NP\'].indexOf(party_id) === -1)}}\n                      <span class="party-label bg-color-political-{{ party_id.toLowerCase() }}" title="{{ parties[party_id.toLowerCase()] }}">{{ party_id }}</span>\n                    {{/()}}\n                  </td>\n                {{/()}}\n\n                {{#(ranked_choice == 1)}}\n                  <td class="first-choice-column first-choice-heading">{{ formatters.number(ranked_choices.1.percentage) }}% ({{ formatters.number(ranked_choices.1.votes_candidate, 0) }}&nbsp;votes)</td>\n                  <td class="second-choice-column first-choice-heading">{{ formatters.number(ranked_choices.2.percentage) }}% ({{ formatters.number(ranked_choices.2.votes_candidate, 0) }}&nbsp;votes)</td>\n                  <td class="third-choice-column first-choice-heading">{{ formatters.number(ranked_choices.3.percentage) }}% ({{ formatters.number(ranked_choices.3.votes_candidate, 0) }}&nbsp;votes)</td>\n                  <td class="final-column first-choice-heading">{{#ranked_choices.100.percentage}}{{ formatters.number(ranked_choices.100.percentage) }}% ({{ formatters.number(ranked_choices.100.votes_candidate, 0) }}&nbsp;votes){{/ranked_choices.100.percentage}}{{^ranked_choices.100.percentage}}&mdash;{{/ranked_choices.100.percentage}}</td>\n                {{/()}}\n\n                {{#(ranked_choice != 1)}}\n                  <td class="percentage">{{ formatters.number(percentage) }}%</td>\n                  {{^isDashboard}}\n                    <td class="votes">{{ formatters.number(votes_candidate, 0) }}</td>\n                  {{/isDashboard}}\n                {{/()}}\n              </tr>\n            {{/()}} {{/results}}\n          </tbody>\n        </table>\n      </div>\n      \n      <a href="#contest/{{ id }}" class="contest-link">{{#isDashboard}}Full results{{/isDashboard}}{{^isDashboard}}Permalink{{/isDashboard}}</a>\n    </div>\n\n\n\n    {{^isDashboard}}\n      <div class="column-medium-30 inner-column-right">\n        <div class="contest-map" id="contest-map-{{ id }}"></div>\n      </div>\n    {{/isDashboard}}\n  </div>\n</div>\n';});


define('text!templates/contests.mustache',[],function () { return '<div class="contests">\n  <a class="dashboard-link" href="#dashboard">&larr; Back to dashboard</a>\n\n  <div class="row">\n    <div class="column-medium-70 inner-column-left contests-title-section">\n      <h2 class="contests-title {{#(lonlat != undefined)}}with-location{{/()}}">{{ (title) ? title : \'Contests\' }}</h2>\n\n      <p class="caption">\n        Found\n          {{#(models.length == 0 && !synced)}}\n            <i class="loading small"></i>\n          {{/())}}\n          {{#synced}}\n            {{ models.length }}\n          {{/synced}}\n        results.\n      </p>\n\n      {{#(lonlat != undefined)}}\n        <p class="caption">The map below shows the approximate location of your search. If the location is not correct, try <a href="#dashboard">searching for a more specific address</a>.</p>\n\n        <div id="location-map"></div>\n      {{/())}}\n    </div>\n\n    <div class="column-medium-30 inner-column-right"></div>\n  </div>\n\n  <div>\n    {{#(models.length == 0 && !synced)}}\n      {{>loading}}\n    {{/())}}\n\n    {{#(models.length == 0 && synced)}}\n      <p class="large">Unable to find any contests.</p>\n    {{/())}}\n  </div>\n\n  <div class="contest-list">\n    {{#models:i}}\n      {{>contest}}\n    {{/models}}\n  </div>\n</div>\n';});


define('text!templates/dashboard.mustache',[],function () { return '<div class="dashboard {{ classes }}">\n\n  <div class="location-search-section">\n    <form role="form" class="" on-submit="addresssSearch">\n\n      <div class="location-search-group">\n        <div class="form-input-group">\n          <label for="address" class="sr-only">Search address for results</label>\n          <input type="text" id="address-search" placeholder="Search address for results">\n\n          <div class="button-group">\n            <button type="submit" class="button primary address-search-submit">Search</button>\n          </div>\n        </div>\n      </div>\n\n      {{#geolocationEnabled}}\n        <div class="geolocation">\n          <a href="#location">Or view contests at your current location <i class="fa fa-location-arrow"></i></a>\n        </div>\n      {{/geolocationEnabled}}\n    </form>\n  </div>\n\n  <div class="last-updated-section">\n    <div>\n      {{#election.date}}\n        {{ election.date.format(\'MMM DD, YYYY\') }} {{ (election.primary) ? \'primary\' : \'general\' }} election {{#election.isTest}}<em>test</em>{{/election.isTest}} results.\n      {{/election.date}}\n      {{#election.updated}}\n        Last updated {{ election.updated.formatToday() }}\n      {{/election.updated}}\n    </div>\n  </div>\n\n  <div class="row">\n    <div class="column-medium-50">\n      <div class="inner-column-left">\n        {{#dashboard:di}}{{#(di < dashboard.length / 2)}}\n          <div class="{{ itemClass }} dashboard-section">\n            {{#(type === \'race\')}}\n              {{>contest}}\n            {{/()}}\n\n            {{#(type === \'custom\')}}\n              {{>stateLeg}}\n            {{/()}}\n\n            {{#(type === \'spacer\')}}\n            {{/()}}\n\n            {{#(type === \'links\')}}\n              <h4>Other elections</h4>\n              <ul class="other-elections">\n                {{#links}}\n                  <li><a href="{{ href }}">{{ text }}</a></li>\n                {{/links}}\n              </ul>\n            {{/()}}\n          </div>\n        {{/()}}{{/dashboard}}\n\n        <div class="elections-search dashboard-section">\n          <h4>Search elections</h4>\n          {{>electionsSearch}}\n        </div>\n      </div>\n    </div>\n\n    <div class="column-medium-50">\n      <div class="inner-column-right">\n        {{#dashboard:di}}{{#(di >= dashboard.length / 2)}}\n          <div class="{{ itemClass }} dashboard-section">\n            {{#(type === \'race\')}}\n              {{>contest}}\n            {{/()}}\n\n            {{#(type === \'custom\')}}\n              {{>stateLeg}}\n            {{/()}}\n\n            {{#(type === \'spacer\')}}\n            {{/()}}\n\n            {{#(type === \'links\')}}\n              <h4>Other elections</h4>\n              <ul class="other-elections">\n                {{#links}}\n                  <li><a href="{{ href }}">{{ text }}</a></li>\n                {{/links}}\n              </ul>\n            {{/()}}\n          </div>\n        {{/()}}{{/dashboard}}\n\n        <div class="elections-search dashboard-section">\n          <h4>Search elections</h4>\n          {{>electionsSearch}}\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n';});


define('text!templates/loading.mustache',[],function () { return '<div class="loading-container">\n  <i class="loading"></i> Loading...\n</div> \n';});


define('text!templates/elections-search-form.mustache',[],function () { return '<form role="form" class="" on-submit="contestSearch">\n\n  <p class="caption" for="contest-search">Search for any election across the state by title or candidate.  Start typing to see suggestions for specific elections, then click on one listed.  Or enter some keywords and hit the Search button (e.g., "<a href="#search/u.s.+representative">U.S. representative</a>" or "<a href="#search/school+board">school board</a>").</p>\n\n  <div class="form-input-group">\n    <input type="text" class="contest-search" placeholder="Search by title{{#capabilities.typeahead}} or candidate{{/capabilities.typeahead}}" />\n\n    <div class="button-group">\n      <button type="submit" class="button primary contest-search-submit">Search</button>\n    </div>\n  </div>\n</form>\n';});

/**
 * Views
 */

define('views',[
  'jquery', 'underscore', 'backbone', 'ractive', 'ractive-events-tap',
  'ractive-backbone', 'leaflet', 'models', 'collections',
  'bloodhound', 'typeahead-js', 'placeholders-js', 'mpConfig', 'mpFormatters',
  'text!templates/application.mustache', 'text!templates/footnote.mustache',
  'text!templates/contest.mustache', 'text!templates/contests.mustache',
  'text!templates/dashboard.mustache', 'text!templates/loading.mustache',
  'text!templates/elections-search-form.mustache'
], function(
  $, _, Backbone, Ractive, RactiveETap, RactiveBackbone, L, models,
  collections, Bloodhound, typeahead, placeholders, mpConfig, mpFormatters,
  tApplication, tFootnote, tContest,
  tContests, tDashboard, tLoading, tElectionsSearch
  ) {
  var views = {};

  // Ractive decorator to highlight changes
  // Sample use: <span class="highlighter" decorator="highlight:{{ election.updated.format('h:mm a') }}">{{ election.updated.format('h:mm a') }}</span>
  views.highlightDecorator = function(node, content) {
    return {
      update: function() {
        var $node = $(node);
        $node.removeClass('unhighlight');
        $node.addClass('highlight');

        setTimeout(function() {
          $node.addClass('unhighlight');
        }, 200);
      },
      teardown: function() {
        // Nothing to tear down
      }
    };
  };
  Ractive.decorators.highlight = views.highlightDecorator;

  // General viesl
  views.ApplicationView = Ractive.extend({
    init: function() {
      // Add parties for reference
      this.set('parties', mpConfig.politicalParties);
    },
    template: tApplication
  });

  views.FootnoteView = Ractive.extend({
    init: function() {
    },
    template: tFootnote
  });

  // Base view to extend others from
  views.ContestBaseView = Ractive.extend({
    defaultMapStyle: {
      stroke: true,
      color: '#2DA51D',
      weight: 1.5,
      opacity: 0.9,
      fill: true,
      fillColor: '#2DA51D',
      fillOpacity: 0.2,
      clickable: false
    },

    adapt: ['Backbone'],

    // Put together map for boundary(s)
    makeMap: function(id, boundaries) {
      var thisView = this;
      var featureGroup;
      var shapes;
      var found = {};
      var map;
      boundaries = _.isArray(boundaries) ? boundaries : [boundaries];

      // Ensure that we only add the same boundary once
      boundaries = _.filter(boundaries, function(b) {
        if (_.isUndefined(found[b.slug])) {
          found[b.slug] = true;
          return true;
        }
        else {
          return false;
        }
      });

      // Just get the shapes
      shapes = _.map(boundaries, function(b, bi) {
        return b.simple_shape;
      });

      // Make map
      map = new L.Map(id, {
        zoom: 10,
        center: [44.9800, -93.2636],
        scrollWheelZoom: false,
        trackResize: true,
        zoomControl: false,
        dragging: false
      });
      map.addControl(new L.Control.Zoom({ position: 'topright' }));
      map.attributionControl.setPrefix(false);
      map.addLayer(new L.tileLayer('//{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png'));

      // Make GeoJSON layer from shapes
      featureGroup = new L.featureGroup();
      _.each(shapes, function(s) {
        var layer = new L.geoJson(s);
        layer.setStyle(thisView.defaultMapStyle);
        featureGroup.addLayer(layer);
      });
      map.addLayer(featureGroup);

      // Fit bounds breaks stuff because the geojson is not necessarily
      // fully loaded in the map, so we wrap this timer around it, as
      // Leaflet does not provide an sort of mechanism to allow us to know
      // when the layer is fully loaded
      window.setTimeout(function() {
        map.fitBounds(featureGroup.getBounds());
      }, 500);
    },

    // Handle title change for document title
    observeTitle: function(originalTitle) {
      this.observe('title', function(newValue, oldValue) {
        if (newValue) {
          document.title = (originalTitle) ? newValue + ' | ' + originalTitle :
            newValue;
        }
      });
    }
  });

  views.DashboardView = views.ContestBaseView.extend({
    template: tDashboard,

    partials: {
      contest: tContest,
      loading: tLoading,
      electionsSearch: tElectionsSearch
    },

    init: function(options) {
      var thisView = this;
      var $contestSearch = $(this.el).find('.contest-search');
      var query, querySearchEngine;
      this.app = options.app;

      // Attach formatters
      this.set('formatters', mpFormatters);
      // Add parties
      this.set('parties', mpConfig.politicalParties);

      // Typeahead.  This (used to?) break in IE. Query can be
      // either a contest or candidate
      query = this.app.options.electionsAPI +
        "SELECT c.id AS id, title AS title " +
        "FROM contests AS c WHERE " +
        "c.title LIKE '%%QUERY%' " +
        "OR c.sub_title LIKE '%%QUERY%' " +
        "UNION " +
        "SELECT c.id AS id, " +
        "r.candidate || ' (' || c.title || ')' AS title " +
        "FROM results AS r " +
        "JOIN contests AS c ON r.contest_id = c.id " +
        "WHERE r.candidate LIKE '%%QUERY%' ORDER BY title LIMIT 20 ";

      // Create bloodhound engine
      querySearchEngine = new Bloodhound({
        name: 'Contests and Candidates',
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('title'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        remote: {
          url: query,
          replace: function(url, uriEncodedQuery) {
            var query = decodeURIComponent(uriEncodedQuery);
            query = query.replace(new RegExp(' ', 'g'), '%');
            return encodeURI(url.replace(new RegExp(this.wildcard, 'g'), query));
          },
          ajax: {
            dataType: 'jsonp',
            jsonpCallback: 'mpServerSideCachingHelper'
          }
        }
      });
      querySearchEngine.initialize();

      // Make typeahead functionality for search
      $contestSearch.each(function() {
        $(this).typeahead(null, {
          displayKey: 'title',
          source: querySearchEngine.ttAdapter(),
          minLength: 3,
          hint: true,
          highlight: true
        });

        // Handle search selected
        $(this).on('typeahead:selected', function(e, data, name) {
          thisView.app.router.navigate('/contest/' + data.id, { trigger: true });
        });
      });

      // Teardown event to remove typeahead gracefully
      this.on('teardown', function() {
        $contestSearch.typeahead('destroy');
      });

      // Mark if geolocation is availablle
      this.set('geolocationEnabled', (_.isObject(navigator) && _.isObject(navigator.geolocation)));
    }
  });

  views.ContestView = views.ContestBaseView.extend({
    template: tContest,

    partials: {
      loading: tLoading
    },

    init: function() {
      this.set('classes', 'contest-view');

      // Attach formatters
      this.set('formatters', mpFormatters);
      // Add parties
      this.set('parties', mpConfig.politicalParties);

      // Make a map if boundary has been fetched
      this.observe('fetchedBoundary', function(newValue, oldValue) {
        if (newValue) {
          this.makeMap('contest-map-' + this.get('id'), this.get('boundarySets'));
        }
      });
    }
  });

  views.ContestsView = views.ContestBaseView.extend({
    template: tContests,

    partials: {
      contest: tContest,
      loading: tLoading
    },

    init: function() {
      var thisView = this;
      var shapes = [];
      var rendered = {};
      var modelBoundarySet = {};

      // Attach formatters
      this.set('formatters', mpFormatters);
      // Add parties
      this.set('parties', mpConfig.politicalParties);

      // React to boundary update.  For some reason, this is getting changed
      // more than once.
      this.observe('models.*.fetchedBoundary', function(newValue, oldValue, keypath) {
        //Keypath example models.0.fetchedBoundary
        var parts = keypath.split('.');
        var m = this.get(parts[0] + '.' + parts[1]); // var m = this.get('models.0')

        if (newValue && _.isArray(m.get('boundarySets')) && _.isObject(m.get('boundarySets')[0]) && _.isObject(m) &&
          !modelBoundarySet[m.get('id')]) {
          modelBoundarySet[m.get('id')] = true;
          this.makeMap('contest-map-' + m.get('id'), m.get('boundarySets'));
        }
      });

      // Update view when synced
      this.data.models.on('sync', function() {
        thisView.set('synced', true);
      });

      // Make location map if lonlat exist
      this.observe('lonlat', function(newValue, oldValue) {
        var ll = newValue;
        var map;
        var circle;

        if (_.isArray(ll) && _.isNumber(ll[0])) {
          map = new L.Map('location-map', {
            zoom: 13,
            center: [ll[1], ll[0]],
            scrollWheelZoom: false,
            trackResize: true,
            zoomControl: false,
            dragging: false
          });
          map.attributionControl.setPrefix(false);
          map.addLayer(new L.tileLayer('//{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png'));

          circle = new L.circleMarker([ll[1], ll[0]], 10);
          circle.setStyle(this.defaultMapStyle);
          map.addLayer(circle);
        }
      });
    }
  });


  return views;
});

/**
 * Routers
 */
define('routers',[
  'jquery', 'underscore', 'backbone', 'models', 'collections', 'views'
], function($, _, Backbone, models, collections, views) {
  var routers = {};

  routers.DashboardRouter = Backbone.Router.extend({
    initialize: function(options) {
      this.options = options;
      this.app = options.app;

      // Reload interface
      if (this.app.options.interfaceRefresh) {
        window.setTimeout(function() {
          document.location.reload(true);
        }, this.app.options.interfaceRefresh);
      }
    },

    routes: {
      'dashboard': 'routeDashboard',
      'search/:term': 'routeSearch',
      'contest/:contest': 'routeContest',
      'location(/:place)': 'routeLocation',
      '*default': 'routeDefault'
    },

    start: function() {
      Backbone.history.start();
    },

    routeDefault: function() {
      this.navigate('/dashboard', { trigger: true, replace: true });
    },

    routeDashboard: function() {
      var thisRouter = this;
      var data = {};
      var partials = {};
      this.teardownObjects();

      // Go through dashboard config and make objects
      // as needed.  this.app.dashboardContests is used to
      // teardown objects later
      this.app.dashboardContests = {};
      data.dashboard = _.map(this.options.dashboard, function(d, di) {
        var n;

        if (d.type === 'race') {
          n = new models.ContestModel(d, { app: thisRouter.app });
          n.connect(false);
          n.set('isDashboard', true);
          thisRouter.app.dashboardContests[d.id] = n;
          return n;
        }

        if (d.type === 'custom') {
          n = new models.CustomQuery({ type: d.type }, _.extend(d, { app: thisRouter.app }));
          n.connect();
          n.set('isDashboard', true);
          // Can't find a way to use partial or components with
          // variable names
          partials.stateLeg = d.template;
          thisRouter.app.dashboardContests[d.id] = n;
          return n;
        }
        return d;
      });

      // Get and connect to election metadata
      this.app.election = new models.ElectionModel({}, { app: this.app });
      data.election = this.app.election;
      this.app.election.connect();

      // Create dashboard view
      data.title = 'Dashboard';
      this.app.dashboardView = new views.DashboardView({
        el: this.app.$el.find('.content-container'),
        data: data,
        app: this.app,
        partials: partials
      });

      // Handle searches here as we have an easy reference
      // to the router.
      this.app.dashboardView.on('addresssSearch', function(e) {
        var val = $(this.el).find('#address-search').val();
        e.original.preventDefault();
        if (val) {
          thisRouter.navigate('/location/' + encodeURIComponent(val),
          { trigger: true });
        }
      });
      this.app.dashboardView.on('contestSearch', function(e) {
        e.original.preventDefault();
        var $input = $(e.node).find('.contest-search.tt-input');
        var val = $input.val();

        if (val) {
          thisRouter.navigate('/search/' + encodeURIComponent(val),
          { trigger: true });
        }
      });

      this.app.dashboardView.observeTitle(this.app.options.originalTitle);
      this.reFocus();
    },

    routeSearch: function(term) {
      this.teardownObjects();

      this.app.contestsSearch = new collections.ContestsCollection([], {
        app: this.app,
        search: term
      });
      this.app.contestsSearch.connect();
      this.app.contestsSearchView = new views.ContestsView({
        el: this.app.$el.find('.content-container'),
        data: {
          models: this.app.contestsSearch,
          title: 'Search for "' + term.replace(/\+/g, ' ') + '"'
        }
      });
      this.app.contestsSearchView.observeTitle(this.app.options.originalTitle);
      this.reFocus();
    },

    // Single contest route.  Creates contest model, fetches it
    // and renders view into application container.
    routeContest: function(contest) {
      this.teardownObjects();

      this.app.contest = new models.ContestModel({ id: contest }, { app: this.app });
      this.app.contest.connect();
      this.app.contestView = new views.ContestView({
        el: this.app.$el.find('.content-container'),
        data: this.app.contest
      });
      this.app.contestView.observeTitle(this.app.options.originalTitle);
      this.reFocus();
    },

    // Route based different places.  If no place, then geolocate user,
    // if lat,lon, then handle that, otherwise assume an address.
    routeLocation: function(place) {
      var thisRouter = this;
      this.teardownObjects();

      // Handle location
      function handleLocation(lonlat) {
        thisRouter.app.locationContests = new collections.ContestsLocationCollection(
          [], {
            app: thisRouter.app,
            lonlat: lonlat
          });
        thisRouter.app.locationContests.fetchBoundaryFromCoordinates();
        thisRouter.app.contestsLocationView = new views.ContestsView({
          el: thisRouter.app.$el.find('.content-container'),
          data: {
            models: thisRouter.app.locationContests,
            title: (place) ? 'Contests for "' + place + '"' : 'Contests for your location',
            lonlat: lonlat
          }
        });
        thisRouter.app.contestsLocationView.observeTitle(thisRouter.app.options.originalTitle);
        thisRouter.reFocus();
      }

      // Check for place format.  If no place, use geolocation, otherwise look
      // for a non-address and valid lat/lon, otherwise, assume address.
      if (!place) {
        this.geolocate().done(function(lonlat) {
          handleLocation(lonlat);
        });
      }
      else if (!/[a-zA-Z]+/.test(place) && !_.isNaN(parseFloat(place.split(',')[0])) && !_.isNaN(parseFloat(place.split(',')[1]))) {
        handleLocation([parseFloat(place.split(',')[0]), parseFloat(place.split(',')[1])]);
      }
      else {
        this.addressLocate(place).done(function(lonlat) {
          handleLocation(lonlat);
        });
      }
    },

    // Find location based on browser, returns promise.
    geolocate: function() {
      var thisRouter = this;
      var defer = $.Deferred();

      navigator.geolocation.getCurrentPosition(function(position) {
        defer.resolveWith(thisRouter, [[ position.coords.longitude, position.coords.latitude ]]);
      }, function(err) {
        defer.rejectWith(thisRouter, [{ 'message' : 'Issue retrieving current position.' }]);
      });

      return defer.promise();
    },

    // Find location based on address, returns promise.
    addressLocate: function(address) {
      var thisRouter = this;
      var defer = $.Deferred();
      var url = this.app.options.mapQuestQuery.replace('[[[KEY]]]', this.app.options.mapQuestKey)
        .replace('[[[ADDRESS]]]', encodeURIComponent(address));

      $.ajax({
        dataType: 'jsonp',
        url: url
      }).done(function(response) {
          var latlng;

          if (_.size(response.results[0].locations) > 0 &&
            _.isObject(response.results[0].locations[0].latLng)) {
            latlng = response.results[0].locations[0].latLng;
            defer.resolveWith(thisRouter, [[latlng.lng, latlng.lat]]);
          }
          else {
            defer.rejectWith(thisRouter,  [{ 'message' : 'Issue retrieving position from address.' }]);
          }
        })
        .fail(function() {
          defer.rejectWith(thisRouter, arguments);
        });

      return defer.promise();
    },

    // Since we can change view drastically, we need to scoll back up to the
    // top on new.  But we don't want to do it the first time
    reFocus: function() {
      if (this.viewed) {
        $('html, body').animate({ scrollTop: this.app.$el.offset().top - 5 }, 750);
      }
      this.viewed = true;
    },

    // Tear down any existing objects
    teardownObjects: function() {
      var thisRouter = this;
      var views = ['contestView', 'contestsSearchView', 'contestsLocationView'];
      var models = ['contest', 'contestsSearch', 'locationContests', 'election'];

      // Merge in dashboard contests
      if (_.isObject(this.app.dashboardContests)) {
        models = _.union(models, _.keys(this.app.dashboardContests));
      }

      // Handle backbone objects
      _.each(models, function(m) {
        if (_.isObject(thisRouter.app[m])) {
          thisRouter.app[m].stopListening();
          thisRouter.app[m].disconnect();
        }
      });
      // Handle ractive objects
      _.each(views, function(v) {
        if (_.isObject(thisRouter.app[v])) {
          if (_.isObject(thisRouter.app[v].map)) {
            // Not sure why, but removing the map fails most of the time
            // and really screws things up
            //thisRouter.app[v].map.remove();
          }

          thisRouter.app[v].teardown();
          delete thisRouter.app[v];
        }
      });
    }
  });

  return routers;
});


define('text!templates/dashboard-state-leg.mustache',[],function () { return '<div class="dashboard-state-leg">\n  <h3>{{#(chamber === "senate")}}MN Senate{{/()}}{{#(chamber === "house")}}MN House of Representatives{{/()}}</h3>\n\n  {{#note}}<p class="small">{{ note }}</p>{{/note}}\n\n  {{#(!contests.length)}}\n    {{>loading}}\n  {{/()}}\n\n  <div class="state-leg-boxes cf">\n    <div class="state-leg-boxes-left">\n      {{#contests:ci}}{{#(ci < contests.length / 2)}}\n        <a href="#/contest/{{ id }}" class="\n          {{#(!done && some)}}some{{/()}}\n          {{#done}}done bg-color-political-{{ partyWon.toLowerCase() }}{{/done}}\n          {{#tooclose}}too-close-to-call{{/tooclose}}\n          {{#partyShift}}party-shift{{/partyShift}}\n          state-leg-box" title="{{ title }}"></a>\n      {{/()}}{{/contests}}\n    </div>\n    <div class="state-leg-boxes-right">\n      {{#contests:ci}}{{#(ci >= contests.length / 2)}}\n        <a href="#/contest/{{ id }}" class="\n          {{#(!done && some)}}some{{/()}}\n          {{#done}}done bg-color-political-{{ partyWon.toLowerCase() }}{{/done}}\n          {{#tooclose}}too-close-to-call{{/tooclose}}\n          {{#partyShift}}party-shift{{/partyShift}}\n          state-leg-box" title="{{ title }}"></a>\n      {{/()}}{{/contests}}\n    </div>\n  </div>\n\n  <div class="state-leg-totals">\n    {{#counts:ci}}\n      <span class="color-political-{{ id.toLowerCase() }}  {{^party}}too-close-to-call{{/party}}" title="{{ party }}{{^party}}Too close to call{{/party}}">{{ count }}</span>\n      {{#(ci < counts.length - 1)}} -&nbsp; {{/()}}\n    {{/counts}}\n  </div>\n\n  <div class="state-leg-legend">\n    <div class="legend-item">\n      <div class="legend-box unknown"></div> Not reporting yet\n    </div>\n\n    <div class="legend-item">\n      <div class="legend-box some"></div> Some reporting\n    </div>\n\n    <div class="legend-item">\n      <div class="legend-box solid"></div> Colored box is fully reported\n    </div>\n\n    <div class="legend-item">\n      <div class="legend-box too-close-to-call"></div> Too close to call\n    </div>\n\n    <div class="legend-item">\n      <div class="legend-box party-shift"></div> District set to change parties\n    </div>\n  </div>\n\n  {{#(chamber === "house")}}\n    <div class="state-leg-rnet">\n      <div class="heading">\n        Current Republican net gain:\n        <span class="color-political-r rnet">\n          {{ (rNet > 0) ? \'+\' : \'\' }}{{ rNet }}\n        </span>\n      </div>\n      <div class="sub-heading">Republicans need a net gain of at least +9 to win control of the House.</div>\n    </div>\n  {{/()}}\n\n  {{#(chamber === "senate")}}\n    <div class="state-leg-rnet">\n      <div class="heading">\n        Current DFL net gain:\n        <span class="color-political-dfl rnet">\n          {{ (dflNet > 0) ? \'+\' : \'\' }}{{ dflNet }}\n        </span>\n      </div>\n      <div class="sub-heading">DFLers need a net gain of at least +2 to win control of the Senate.</div>\n    </div>\n  {{/()}}\n\n</div>\n\n<script>\n\n</script>\n';});

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
        'minneapolis-parks-and-recreation-districts-2014',
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
          title: 'U.S. President',
          type: 'race',
          id: 'id-MN----0101',
          rows: 2
        },
        {
          title: 'U.S. Senate',
          type: 'race',
          id: 'id-MN----0102',
          rows: 2
        },
        {
          title: 'U.S. House — First District',
          type: 'race',
          id: 'id-MN---1-0104',
          rows: 2
        },
        {
          title: 'U.S. House — Second District',
          type: 'race',
          id: 'id-MN---2-0105',
          rows: 2
        },
        {
          title: 'U.S. House – Seventh District',
          type: 'race',
          id: 'id-MN---7-0110',
          rows: 2
        },
        {
          type: 'custom',
          id: 'state-sen',
          template: tDStateLeg,
          query: "SELECT r.id AS results_id, r.candidate, r.party_id, r.percentage, " +
            "c.id, c.title, c.precincts_reporting, c.total_effected_precincts, c.incumbent_party, c.called " +
            "FROM contests AS c LEFT JOIN results AS r " +
            "ON c.id = r.contest_id WHERE title LIKE '%state senator%' " +
            "ORDER BY c.title, r.percentage, r.candidate ASC LIMIT 400",
          parse: function(response, options) {
            var parsed = {};
            var tempContests = [];

            parsed.chamber = "senate";

            parsed.note = "Solid colored boxes indicate the party that is leading with all precincts reporting. If the lead is within 3 percentage points, the race is instead marked too close to call. Vote totals may change as more ballots are counted after Election Day.";

            // Put contest info into friendly format
            parsed.contests = {};
            _.each(response, function(r, ri) {
              parsed.contests[r.id] = parsed.contests[r.id] || {
                id: r.id,
                title: r.title,
                precincts_reporting: r.precincts_reporting,
                total_effected_precincts: r.total_effected_precincts,
                incumbent_party: r.incumbent_party,
                called: r.called,
                toolcose: false,
                results: []
              };
              parsed.contests[r.id].results.push({
                id: r.results_id,
                candidate: r.candidate,
                party_id: r.party_id,
                percentage: r.percentage
              });
            });

            // Process contests
            parsed.contests = _.map(parsed.contests, function(c, ci) {
              c.done = (c.precincts_reporting === c.total_effected_precincts);
              c.some = (c.precincts_reporting > 0);
              c.partyWon = _.max(c.results, function(r, ri) {
                return r.percentage;
              }).party_id;

              // Test data
              /*
              var t = Math.random();
              if (t < 0.9) {
                c.done = true;
                c.partyWon = (Math.random() < 0.5) ? 'DFL' : 'R';
              }
              */

              c.partyShift = (c.partyWon !== c.incumbent_party && c.done);
              c.results = _.sortBy(c.results, 'candidate').reverse();
              c.results = _.sortBy(c.results, 'percentage').reverse();

              //Districts where the vote is within 3 percentage points are going to be considered
              //too close to call due to late-arriving mail-in ballots in 2020
              if (c.done && c.results[0].percentage - c.results[1].percentage < 3 && !c.called) {
                c.partyWon = '';
                c.partyShift = false;
                c.tooclose = true;
              }
              
              return c;
            });

            // Sort contests, this could get messey
            parsed.contests = _.sortBy(parsed.contests, 'title');
            parsed.contests = _.sortBy(parsed.contests, 'partyShift').reverse();
            parsed.contests = _.sortBy(parsed.contests, function(c, ci) {
              if (c.done) {
                return (c.partyWon === 'DFL') ? 'AAAADFL' :
                  (c.partyWon === 'R') ? 'ZZZZZR' : 'MMMMMM' + c.partyWon;
              }
              else {
                return (c.some) ? 'MMMAAAAAA' : 'MMMMMMZ';
              }
            });

            // Counts
            parsed.counts = {};
            _.each(parsed.contests, function(c, ci) {
              if (c.done) {
                if (parsed.counts[c.partyWon]) {
                  parsed.counts[c.partyWon].count += 1;
                }
                else {
                  parsed.counts[c.partyWon] = {
                    id: (c.tooclose) ? 'MMMMMMtooclose' : c.partyWon,  //Special handling for 2020 too close to call votes
                    count: 1,
                    party: mpConfig.politicalParties[c.partyWon.toLowerCase()]
                  };
                }
              }
              else {
                if (parsed.counts.unknown) {
                  parsed.counts.unknown.count += 1;
                }
                else {
                  parsed.counts.unknown = {
                    id: 'MMMMMMMunknown',
                    count: 1,
                    party: 'Not fully reported yet'
                  };
                }
              }
            });
            parsed.counts = _.sortBy(parsed.counts, 'id');

            // dflNet net because senate is R controlled
            parsed.dflNet = 0;
            _.each(parsed.contests, function(c, ci) {
              if (c.done && c.partyShift && c.partyWon === 'DFL') {
                parsed.dflNet += 1;
              }
              if (c.done && c.partyShift && c.incumbent_party === 'DFL') {
                parsed.dflNet -= 1;
              }
            });

            // Is everything done
            parsed.allDone = (_.where(parsed.contests, { done: true }).length ===
              parsed.contests.length);

            return parsed;
          }
        },
        {
          type: 'custom',
          id: 'state-leg',
          template: tDStateLeg,
          query: "SELECT r.id AS results_id, r.candidate, r.party_id, r.percentage, " +
            "c.id, c.title, c.precincts_reporting, c.total_effected_precincts, c.incumbent_party, c.called " +
            "FROM contests AS c LEFT JOIN results AS r " +
            "ON c.id = r.contest_id WHERE title LIKE '%state representative%' " +
            "ORDER BY c.title, r.percentage, r.candidate ASC LIMIT 425",
          parse: function(response, options) {
            var parsed = {};
            var tempContests = [];

            parsed.chamber = "house";

            // Put contest info into friendly format
            parsed.contests = {};
            _.each(response, function(r, ri) {
              parsed.contests[r.id] = parsed.contests[r.id] || {
                id: r.id,
                title: r.title,
                precincts_reporting: r.precincts_reporting,
                total_effected_precincts: r.total_effected_precincts,
                incumbent_party: r.incumbent_party,
                called: r.called,
                toolcose: false,
                results: []
              };
              parsed.contests[r.id].results.push({
                id: r.results_id,
                candidate: r.candidate,
                party_id: r.party_id,
                percentage: r.percentage
              });
            });

            // Process contests
            parsed.contests = _.map(parsed.contests, function(c, ci) {
              c.done = (c.precincts_reporting === c.total_effected_precincts);
              c.some = (c.precincts_reporting > 0);
              c.partyWon = _.max(c.results, function(r, ri) {
                return r.percentage;
              }).party_id;

              // Test data
              /*
              var t = Math.random();
              if (t < 0.9) {
                c.done = true;
                c.partyWon = (Math.random() < 0.5) ? 'DFL' : 'R';
              }
              */


              c.partyShift = (c.partyWon !== c.incumbent_party && c.done);
              c.results = _.sortBy(c.results, 'candidate').reverse();
              c.results = _.sortBy(c.results, 'percentage').reverse();

              //Districts where the vote is within 3 percentage points are going to be considered
              //too close to call due to late-arriving mail-in ballots in 2020
              if (c.done && c.results[0].percentage - c.results[1].percentage < 3 && !c.called) {
                c.partyWon = '';
                c.partyShift = false;
                c.tooclose = true;
              }
              
              return c;
            });

            // Sort contests, this could get messey
            parsed.contests = _.sortBy(parsed.contests, 'title');
            parsed.contests = _.sortBy(parsed.contests, 'partyShift').reverse();
            parsed.contests = _.sortBy(parsed.contests, function(c, ci) {
              if (c.done) {
                return (c.partyWon === 'DFL') ? 'AAAADFL' :
                  (c.partyWon === 'R') ? 'ZZZZZR' : 'MMMMMM' + c.partyWon;
              }
              else {
                return (c.some) ? 'MMMAAAAAA' : 'MMMMMMZ';
              }
            });

            // Counts
            parsed.counts = {};
            _.each(parsed.contests, function(c, ci) {
              if (c.done) {
                if (parsed.counts[c.partyWon]) {
                  parsed.counts[c.partyWon].count += 1;
                }
                else {
                  parsed.counts[c.partyWon] = {
                    id: (c.tooclose) ? 'MMMMMMtooclose' : c.partyWon,  //Special handling for 2020 too close to call votes
                    count: 1,
                    party: mpConfig.politicalParties[c.partyWon.toLowerCase()]
                  };
                }
              }
              else {
                if (parsed.counts.unknown) {
                  parsed.counts.unknown.count += 1;
                }
                else {
                  parsed.counts.unknown = {
                    id: 'MMMMMMMunknown',
                    count: 1,
                    party: 'Not fully reported yet'
                  };
                }
              }
            });
            parsed.counts = _.sortBy(parsed.counts, 'id');

            // R net bc house is DFL controlled
            parsed.rNet = 0;
            _.each(parsed.contests, function(c, ci) {
              if (c.done && c.partyShift && c.partyWon === 'R') {
                parsed.rNet += 1;
              }
              if (c.done && c.partyShift && c.incumbent_party === 'R') {
                parsed.rNet -= 1;
              }
            });
            

            // Is everything done
            parsed.allDone = (_.where(parsed.contests, { done: true }).length ===
              parsed.contests.length);

            return parsed;
          }
        },
        {
          title: 'Associate Justice of the Supreme Court',
          type: 'race',
          id: 'id-MN----7005',
          rows: 2
        },
        {
          type: 'links',
          itemClass: 'dashboard-links',
          links: [
            { href: '#search/u.s.+representative', text: 'All U.S. House races' },
            { href: '#search/hennepin+county+commissioner', text: 'Hennepin County commissioner races'},
            { href: '#search/ramsey+county+commissioner', text: 'Ramsey County commissioner races'},
            { href: '#contest/id-MN---1-1-5000', text: 'Minneapolis school board at-large'},
            { href: '#search/question', text: 'All ballot questions' }
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

define("app", function(){});

