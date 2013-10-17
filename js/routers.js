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
    routeSearch: function(term) {
      this.teardownObjects();

      this.app.contestsSearch = new this.app.ContestsCollection([], {
        app: this.app,
        search: term
      });
      this.app.contestsSearch.connect();
      this.app.contestsSearchView = new this.app.ContestsView({
        el: this.app.$el.find('.content-container'),
        template: this.app.template('template-contests'),
        data: {
          models: this.app.contestsSearch
        },
        partials: {
          contest: this.app.template('template-contest')
        },
        adaptors: [ 'Backbone' ]
      });
    },

    // Single contest route.  Creates contest model, fetches it
    // and renders view into application container.
    routeContest: function(contest) {
      this.teardownObjects();

      this.app.contest = new this.app.ContestModel({ id: contest }, { app: this.app });
      this.app.contest.connect();
      this.app.contestView = new this.app.ContestView({
        el: this.app.$el.find('.content-container'),
        template: this.app.template('template-contest'),
        data: this.app.contest,
        adaptors: [ 'Backbone' ]
      });
    },

    routeContests: function() {
    },

    // Tear down any existing objects
    teardownObjects: function() {
      // Tear down old ones
      if (_.isObject(this.app.contest)) {
        this.app.contest.stopListening();
        this.app.contest.disconnect();
      }
      if (_.isObject(this.app.contestView)) {
        this.app.contestView.teardown();
      }
      if (_.isObject(this.app.contestsSearch)) {
        this.app.contestsSearch.stopListening();
        this.app.contestsSearch.disconnect();
      }
      if (_.isObject(this.app.contestsSearchView)) {
        this.app.contestsSearchView.teardown();
      }
    }
  });
})(mpApps['minnpost-elections-dashboard'], jQuery);