/**
 * Routers
 */
(function(App, $, undefined) {
  App.prototype.DashboardRouter = Backbone.Router.extend({
    initialize: function(options) {
      this.options = options;
      this.app = options.app;
    },

    routes: {
      'dashboard': 'routeDashboard',
      'search/:term': 'routeSearch',
      'contest/:contest': 'routeContest',
      'contests/:contests': 'routeContests',
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

    // Single contest route.  Creates contest model, fetches it
    // and renders view into application container.
    routeContest: function(contest) {
      // Tear down old ones
      if (_.isObject(this.app.contest)) {
        this.app.contest.stopListening();
        this.app.contest.disconnect();
      }
      if (_.isObject(this.app.contestView)) {
        this.app.contestView.teardown();
      }

      // Create new objects
      this.app.contest = new this.app.ContestModel({ id: contest }, { app: this.app });
      this.app.contestView = new this.app.ContestView({
        el: this.app.$el.find('.content-container'),
        template: this.app.template('template-contest'),
        data: this.app.contest,
        adaptors: [ 'Backbone' ]
      });
    },

    routeContests: function() {
    }
  });
})(mpApps['minnpost-elections-dashboard'], jQuery);