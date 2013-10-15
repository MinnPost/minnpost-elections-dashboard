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

      // Make a map if boundary has been found
      this.observe('boundarySet', function(newValue, oldValue) {
        var layer;

        if (_.isObject(newValue) && _.isObject(newValue.simple_shape)) {
          this.map = new L.Map('contest-map-' + this.data.id, {
            zoom: 10,
            center: [44.9800, -93.2636],
            scrollWheelZoom: false
          });
          this.map.attributionControl.setPrefix(false);
          this.map.addLayer(new L.tileLayer('//{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png'));
          layer = new L.geoJson(newValue.simple_shape);
          this.map.addLayer(layer);
          // Fit bounds breaks stuff
          //this.map.fitBounds(layer.getBounds());
        }
      });
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);