/**
 * Routers
 */
define([
  'jquery', 'underscore', 'backbone', 'models', 'collections', 'views'
], function($, _, Backbone, models, collections, views) {
  var routers = {};

  routers.DashboardRouter = Backbone.Router.extend({
    initialize: function(options) {
      this.options = options;
      this.app = options.app;
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
      this.teardownObjects();

      // Get races objects
      this.app.dashboardContests = {
        contestGovernorR: 'id-MN----0331',
        contestAuditorDFL: 'id-MN----0333',
        contestSenateR: 'id-MN----0102',
        contestHouse60BDFL: 'id-MN---60B-0307',
        contestHouse48BR: 'id-MN---48B-0283'
      };
      _.each(this.app.dashboardContests, function(c, ci) {
        thisRouter.app[ci] = new models.ContestModel({ id: c }, { app: thisRouter.app });
        thisRouter.app[ci].connect(false);
        thisRouter.app[ci].set('isDashboard', true);
        data[ci] = thisRouter.app[ci];
      });

      // Partials don't take arguments, so we have to set some things here.
      // Rows and show_party are exclusive
      //data.contestGovernorDFL.set('rows', 8);
      data.contestGovernorR.set('show_party', 'R');
      data.contestAuditorDFL.set('show_party', 'DFL');
      data.contestSenateR.set('show_party', 'R');
      data.contestHouse60BDFL.set('show_party', 'DFL');
      data.contestHouse48BR.set('show_party', 'R');

      // Get and connect to election metadata
      this.app.election = new models.ElectionModel({}, { app: this.app });
      data.election = this.app.election;
      this.app.election.connect();

      // We need some of this data
      data.capabilities = thisRouter.app.options.capabilities;

      // Create dashboard view
      data.title = 'Dashboard';
      this.app.dashboardView = new views.DashboardView({
        el: this.app.$el.find('.content-container'),
        data: data,
        app: this.app
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
        var $input = $(this.el).find('#contest-search');
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
        $('html, body').animate({ scrollTop: this.app.$el.offset().top - 5}, 750);
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
        }
      });
    }
  });

  return routers;
});
