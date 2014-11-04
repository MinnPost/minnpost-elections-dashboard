/**
 * RequireJS config which maps out where files are and shims
 * any non-compliant libraries.
 */
require.config({
  waitSeconds: 15,
  shim: {
    'simple-statistics': {
      exports: 'ss'
    },
    'highcharts': {
      exports: 'Highcharts'
    },
    'placeholders-js': {
      deps: ['jquery']
    },
    'typeahead-js': {
      deps: ['jquery']
    },
    'bloodhound': {
      dep: ['jquery'],
      exports: 'Bloodhound'
    },
    'lazyload': {
      exports: 'LazyLoad'
    },
    'screenfull': {
      exports: 'screenfull'
    }
  },
  baseUrl: 'js',
  paths: {
    'requirejs': '../bower_components/requirejs/require',
    'almond': '../bower_components/almond/almond',
    'text': '../bower_components/text/text',
    'jquery': '../bower_components/jquery/dist/jquery',
    'underscore': '../bower_components/underscore/underscore',
    'backbone': '../bower_components/backbone/backbone',
    'lazyload': '../bower_components/rgrove-lazyload/lazyload',
    'ractive': '../bower_components/ractive/ractive-legacy',
    'ractive-events-tap': '../bower_components/ractive-events-tap/ractive-events-tap',
    'ractive-backbone': '../bower_components/ractive-backbone/ractive-adaptors-backbone',
    'leaflet': '../bower_components/leaflet/dist/leaflet-src',
    'moment': '../bower_components/momentjs/moment',
    'moment-timezone': '../bower_components/moment-timezone/builds/moment-timezone-with-data',
    'placeholders-js': '../bower_components/Placeholders.js/build/placeholders.jquery',
    'typeahead-js': '../bower_components/typeahead.js/dist/typeahead.jquery',
    'bloodhound': '../bower_components/typeahead.js/dist/bloodhound',
    'screenfull': '../bower_components/screenfull/dist/screenfull',
    'mpConfig': '../bower_components/minnpost-styles/dist/minnpost-styles.config',
    'mpFormatters': '../bower_components/minnpost-styles/dist/minnpost-styles.formatters',
    'mpMaps': '../bower_components/minnpost-styles/dist/minnpost-styles.maps',
    'minnpost-elections-dashboard': 'app'
  }
});
