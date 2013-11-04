(function(App, $, undefined) {

  App.prototype.ApplicationView = Ractive.extend({
    init: function() {
    }
  });

  App.prototype.FootnoteView = Ractive.extend({
    init: function() {
    }
  });

  App.prototype.ContestBaseView = Ractive.extend({
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
        trackResize: true
      });
      map.attributionControl.setPrefix(false);
      map.addLayer(new L.tileLayer('//{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png'));

      // Make GeoJSON layer from shapes
      featureGroup = new L.featureGroup();
      _.each(shapes, function(s) {
        var layer = new L.geoJson(s);
        layer.setStyle({
          stroke: true,
          color: '#2DA51D',
          weight: 1.5,
          opacity: 0.9,
          fill: true,
          fillColor: '#2DA51D',
          fillOpacity: 0.2,
          clickable: false
        });
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

  App.prototype.DashboardView = App.prototype.ContestBaseView.extend({
    init: function(options) {
      var thisView = this;
      var $contestSearch = $(this.el).find('#contest-search');
      var query;
      this.app = options.app;

      // Query can be either a contest or candidate
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

      // Attach formatters
      this.set('fNum', _.formatNumber);

      // Make typeahead functionality for search
      $contestSearch.typeahead({
        name: 'Contests and Candidates',
        remote: {
          url: query,
          dataType: 'jsonp',
          jsonpCallback: 'mpServerSideCachingHelper',
          replace: function(url, uriEncodedQuery) {
            var query = decodeURIComponent(uriEncodedQuery);
            query = query.replace(new RegExp(' ', 'g'), '%');
            return encodeURI(url.replace(new RegExp(this.wildcard, 'g'), query));
          }
        },
        valueKey: 'title'
      });

      // Handle search selected
      $contestSearch.on('typeahead:selected', function(e, data, name) {
        thisView.app.router.navigate('/contest/' + data.id, { trigger: true });
      });

      // Teardown event to remove typeahead gracefully
      this.on('teardown', function() {
        $contestSearch.typeahead('destroy');
      });

      // Mark if geolocation is availablle
      this.set('geolocationEnabled', (_.isObject(navigator) && _.isObject(navigator.geolocation)));
    }
  });

  App.prototype.ContestView = App.prototype.ContestBaseView.extend({
    init: function() {
      this.set('classes', 'contest-view');

      // Attach formatters
      this.set('fNum', _.formatNumber);

      // Make a map if boundary has been found
      this.observe('boundarySets', function(newValue, oldValue) {
        if (_.isArray(newValue) && _.isObject(newValue[0])) {
          this.makeMap('contest-map-' + this.get('id'), newValue);
        }
      });
    }
  });

  App.prototype.ContestsView = App.prototype.ContestBaseView.extend({
    init: function() {
      var thisView = this;
      var shapes = [];
      var rendered = {};

      // Attach formatters
      this.set('fNum', _.formatNumber);

      // React to boundary update.  Not sure how to use wildcards in
      // Ractive, so we hack around it.
      this.observe('models.0.fetchedBoundary', function(newValue, oldValue) {
        var testModel = this.get('models.0.boundarySets');

        if (_.isArray(testModel) && _.isObject(testModel[0])) {
          _.each(this.get('models'), function(m) {
            thisView.makeMap('contest-map-' + m.get('id'), m.get('boundarySets'));
          });
        }
      });
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);