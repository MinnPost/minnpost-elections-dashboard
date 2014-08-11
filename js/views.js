/**
 * Views
 */

define([
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
      if (this.app.options.capabilities.typeahead) {
        query = this.app.options.electionsAPI +
          "SELECT c.id AS id, title AS title " +
          "FROM contests AS c WHERE " +
          "c.title LIKE '%%QUERY%' " +
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
      }

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

      // Make a map if boundary has been found
      this.observe('boundarySets', function(newValue, oldValue) {
        if (_.isArray(newValue) && _.isObject(newValue[0])) {
          this.makeMap('contest-map-' + this.get('id'), newValue);
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
      this.observe('models.*.boundarySets', function(newValue, oldValue, keypath) {
        var parts = keypath.split('.');
        var m = this.get(parts[0] + '.' + parts[1]);

        if (_.isArray(newValue) && _.isObject(newValue[0]) && _.isObject(m) &&
          !modelBoundarySet[m.get('id')]) {
          modelBoundarySet[m.get('id')] = true;
          this.makeMap('contest-map-' + m.get('id'), newValue);
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
