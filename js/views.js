(function(App, $, undefined) {

  App.prototype.ApplicationView = Ractive.extend({
    init: function() {
    }
  });

  App.prototype.FootnoteView = Ractive.extend({
    init: function() {
    }
  });

  App.prototype.ContestView = Ractive.extend({
    init: function() {
      this.set('classes', 'contest-view');

      // Make a map if boundary has been found
      this.observe('boundarySet', function(newValue, oldValue) {
        var thisView = this;
        var layer;

        if (_.isObject(newValue) && _.isObject(newValue.simple_shape)) {
          // Make map
          this.map = new L.Map('contest-map-' + this.data.id, {
            zoom: 10,
            center: [44.9800, -93.2636],
            scrollWheelZoom: false
          });
          this.map.attributionControl.setPrefix(false);
          this.map.addLayer(new L.tileLayer('//{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png'));
          layer = new L.geoJson(newValue.simple_shape);
          this.map.addLayer(layer);

          // Fit bounds breaks stuff because the geojson is not necessarily
          // fully loaded in the map, so we wrap this timer around it, as
          // Leaflet does not provide an sort of mechanism to allow us to know
          // when the layer is fully loaded
          window.setTimeout(function() {
            thisView.map.fitBounds(layer.getBounds());
          }, 500);
        }
      });
    }
  });

  App.prototype.ContestsView = Ractive.extend({
    init: function() {
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);