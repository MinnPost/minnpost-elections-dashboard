/**
 * Routers
 */
(function(app, $, undefined) {
  app.prototype.DashboardRouter = Backbone.Router.extend({
    intialize: function(options) {
      this.options = options;
    },

    routes: {
      'dashboard': 'routeDashboard',
      'search/:term': 'routeSearch',
      'race/:race': 'routeRace',
      'races/*races': 'routeRaces',
      '*default': 'routeDefault'
    },

    start: function() {
      Backbone.history.start();
    },

    routeDefault: function() {
      this.navigate('/dashboard', { trigger: true, replace: true });
    },
    routeDashboard: function() {
    },
    routeSearch: function() {
    },
    routeRace: function() {
    },
    routeRaces: function() {
    }
  });
})(mpApps['minnpost-elections-dashboard'], jQuery);