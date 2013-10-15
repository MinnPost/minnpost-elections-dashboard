/**
 * Routers
 */
(function(App, $, undefined) {
  App.prototype.DashboardRouter = Backbone.Router.extend({
    intialize: function(options) {
      this.options = options;
    },

    routes: {
      'dashboard': 'routeDashboard',
      'search/:term': 'routeSearch',
      'contest/:contest': 'routeContest',
      'contests/*contests': 'routeContests',
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
    routeContest: function(contest) {
      this.contest = new this.ContestModel({ id: contest }, { app: this });
      this.contest.fetch();
    },
    routeContests: function() {
    }
  });
})(mpApps['minnpost-elections-dashboard'], jQuery);