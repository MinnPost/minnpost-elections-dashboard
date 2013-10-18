/**
 * Some core functionality for minnpost applications
 */

/**
 * Global variable to hold the "application" and templates.
 */
var mpApps = mpApps || {};
var mpTemplates = mpTemplates || {};
mpTemplates['minnpost-elections-dashboard'] = mpTemplates['minnpost-elections-dashboard'] || {};

/**
 * Extend underscore
 */
_.mixin({
  /**
   * Formats number
   */
  formatNumber: function(num, decimals) {
    decimals = (_.isUndefined(decimals)) ? 2 : decimals;
    var rgx = (/(\d+)(\d{3})/);
    split = num.toFixed(decimals).toString().split('.');

    while (rgx.test(split[0])) {
      split[0] = split[0].replace(rgx, '$1' + ',' + '$2');
    }
    return (decimals) ? split[0] + '.' + split[1] : split[0];
  },

  /**
   * Formats number into currency
   */
  formatCurrency: function(num) {
    return '$' + _.formatNumber(num, 2);
  },

  /**
   * Formats percentage
   */
  formatPercent: function(num) {
    return _.formatNumber(num * 100, 1) + '%';
  },

  /**
   * Formats percent change
   */
  formatPercentChange: function(num) {
    return ((num > 0) ? '+' : '') + _.formatPercent(num);
  }
});

/**
 * Create "class" for the main application.  This way it could be
 * used more than once.
 */
(function($, undefined) {
  // Create "class"
  App = mpApps['minnpost-elections-dashboard'] = function(options) {
    this.options = _.extend(this.defaultOptions, options);
    this.$el = $(this.options.el);
    this.templates = mpTemplates['minnpost-elections-dashboard'] || {};
    this.data = this.data || {};
  };

  _.extend(App.prototype, {
    // Use backbone's extend function
    extend: Backbone.Model.extend,

    // Default options
    defaultOptions: {
      dataPath: './data/',
      jsonpProxy: 'http://mp-jsonproxy.herokuapp.com/proxy?callback=?&url=',
      electionsAPI: 'http://ec2-54-221-171-99.compute-1.amazonaws.com/?box=ubuntu&q=',
      boundaryAPI: 'http://boundaries.minnpost.com/1.0/'
    },

    /**
     * Template handling.  For development, we want to use
     * the template files directly, but for build, they should be
     * compiled into JS.
     *
     * See JST grunt plugin to understand how templates
     * are compiled.
     *
     * Expects callback like: function(compiledTemplate) {  }
     */
    getTemplates: function(names) {
      var thisApp = this;
      var defers = [];
      names = _.isArray(names) ? names : [names];

      // Go through each file and add to defers
      _.each(names, function(n) {
        var defer;
        var path = 'js/templates/' + n + '.mustache';

        if (_.isUndefined(thisApp.templates[n])) {
          defer = $.ajax({
            url: path,
            method: 'GET',
            async: false,
            contentType: 'text'
          });

          $.when(defer).done(function(data) {
            thisApp.templates[n] = data;
          });
          defers.push(defer);
        }
      });

      return $.when.apply($, defers);
    },
    // Wrapper around getting a template
    template: function(name) {
      return this.templates[name];
    },

    /**
     * Data source handling.  For development, we can call
     * the data directly from the JSON file, but for production
     * we want to proxy for JSONP.
     *
     * `name` should be relative path to dataset minus the .json
     *
     * Returns jQuery's defferred object.
     */
    getLocalData: function(name) {
      var thisApp = this;
      var proxyPrefix = this.options.jsonpProxy;
      var useJSONP = false;
      var defers = [];

      name = (_.isArray(name)) ? name : [ name ];

      // If the data path is not relative, then use JSONP
      if (this.options && this.options.dataPath.indexOf('http') === 0) {
        useJSONP = true;
      }

      // Go through each file and add to defers
      _.each(name, function(d) {
        var defer;
        if (_.isUndefined(thisApp.data[d])) {

          if (useJSONP) {
            defer = $.jsonp({
              url: proxyPrefix + encodeURI(thisApp.options.dataPath + d + '.json')
            });
          }
          else {
            defer = $.getJSON(thisApp.options.dataPath + d + '.json');
          }

          $.when(defer).done(function(data) {
            thisApp.data[d] = data;
          });
          defers.push(defer);
        }
      });

      return $.when.apply($, defers);
    },

    /**
     * Get remote data.  Provides a wrapper around
     * getting a remote data source, to use a proxy
     * if needed, such as using a cache.
     */
    getRemoteData: function(options) {
      if (this.options.remoteProxy) {
        options.url = options.url + '&callback=proxied_jqjsp';
        options.url = app.options.remoteProxy + encodeURIComponent(options.url);
        options.callback = 'proxied_jqjsp';
        options.cache = true;
      }
      else {
        options.url = options.url + '&callback=?';
      }

      return $.jsonp(options);
    },

    // Placeholder start
    start: function() {
    }
  });
})(jQuery);



mpTemplates = mpTemplates || {}; mpTemplates['minnpost-elections-dashboard'] = {"template-application":"<div class=\"message-container\"></div>\n\n<div class=\"content-container\"></div>\n\n<div class=\"footnote-container\"></div>","template-contest":"<div class=\"contest {{ classes }}\">\n  <div>\n    {{#(title == undefined)}}\n      {{>loading}}\n    {{/())}}\n  </div>\n\n  <h3>{{ title }}</h3>\n  <a href=\"#contest/{{ contest_id }}\">link</a>\n\n  <p>\n    Last updated at {{ updated.format('MMMM Do YYYY, h:mm:ss a') }} <br />\n    Number of seats: {{ seats }} <br />\n    Ranked-choiced race: {{ (ranked_choice == 1) ? 'Yes' : 'No' }} <br />\n    {{ precincts_reporting }} of {{ total_effected_precincts }} precincts reporting.\n  </p>\n\n  <table>\n    <thead>\n      <tr>\n        <th>Winner</th>\n        <th>Candidate</th>\n        <th>Incumbent</th>\n        <th>Party</th>\n        {{#(ranked_choice == 1)}}\n          <th>1st Choice Percentage</th>\n          <th>2nd Choice Percentage</th>\n          <th>3rd Choice Percentage</th>\n          <th>Final</th>\n        {{/()}}\n        {{#(ranked_choice != 1)}}\n          <th>Votes</th>\n          <th>Percentage</th>\n        {{/()}}\n      </tr>\n    </thead>\n\n    <tbody>\n      {{#results:r}}\n        <tr>\n          <td>{{#winner}}Y{{/winner}}{{#(winner === false)}}N{{/()}}</td>\n          <td>{{ candidate }}</td>\n          <td>{{ incumbent_code }}</td>\n          <td>{{ party_id }}</td>\n\n          {{#(ranked_choice == 1)}}\n            <td>{{ ranked_choices.1.percentage }}</td>\n            <td>{{ ranked_choices.2.percentage }}</td>\n            <td>{{ ranked_choices.3.percentage }}</td>\n            <td>{{ ranked_choices.100.percentage }}</td>\n          {{/()}}\n\n          {{#(ranked_choice != 1)}}\n            <td>{{ votes_candidate }}</td>\n            <td>{{ percentage }}</td>\n          {{/()}}\n        </tr>\n      {{/results}}\n    </tbody>\n  </table>\n\n  <div class=\"contest-map\" id=\"contest-map-{{ id }}\">\n  </div>\n\n</div>","template-contests":"<div class=\"contests\">\n  <div>\n    {{#(models.length == 0)}}\n      {{>loading}}\n    {{/())}}\n  </div>\n\n  <h3>Contests</h3>\n\n  {{#models:i}}\n    {{>contest}}\n  {{/models}}\n\n  <div class=\"contest-map\" id=\"contests-map\">\n\n  </div>\n</div>","template-dashboard":"<div class=\"dashboard {{ classes }}\">\n\n  <h3>Dashboard</h3>\n\n  <ul>\n    <li><a href=\"#search/minneapolis+mayor\">Minneapolis mayor</a></li>\n    <li><a href=\"#search/minneapolis+ward\">Minneapolis council races</a></li>\n    <li><a href=\"#search/duluth\">Duluth races</a></li>\n  </ul>\n\n</div>","template-footnote":"<div class=\"footnote\">\n  <p>Unofficial election data provided by the <a href=\"http://www.sos.state.mn.us/\" target=\"_blank\">MN Secretary of State</a>.  Test data will be provided until 8PM on Election Night.  Some code, techniques, and data on <a href=\"https://github.com/zzolo/minnpost-elections-dashboard\" target=\"_blank\">Github</a>.</p>\n</div>","template-loading":"<div class=\"loading-container\">\n  <div class=\"loading\"><span>Loading...</span></div>\n</div>"};

/**
 * Main app logic for: minnpost-elections-dashboard
 */
(function(App, $, undefined) {
  _.extend(App.prototype, {
    // Start function that starts the application.
    start: function() {
      var thisApp = this;
      var templates = ['template-application', 'template-footnote', 'template-dashboard', 'template-loading', 'template-contest', 'template-contests'];

      this.getTemplates(templates).done(function() {
        // Render the container and "static" templates.
        thisApp.applicationView = new thisApp.ApplicationView({
          el: thisApp.$el,
          template: thisApp.template('template-application')
        });
        thisApp.footnoteView = new thisApp.FootnoteView({
          el: thisApp.$el.find('.footnote-container'),
          template: thisApp.template('template-footnote')
        });

        // Create router which will handle most of the high
        // level logic
        thisApp.router = new thisApp.DashboardRouter(_.extend(thisApp.options, { app: thisApp }));
        thisApp.router.start();
      });
    }
  });
})(mpApps['minnpost-elections-dashboard'], jQuery);

/**
 * Models
 */
(function(App, $, undefined) {
  App.prototype.ContestModel = Backbone.Model.extend({
    // Base query for the contest
    query: "SELECT * FROM contests AS c LEFT JOIN results AS r " +
      "ON c.contest_id = r.contest_id WHERE c.contest_id = '%CONTEST_ID%'",

    // Fields that are for contests (not result)
    contestFields: ['boundary', 'contest_id', 'contest_id_name', 'county_id', 'district_code', 'office_id', 'office_name_id', 'precinct_id', 'precincts_reporting', 'question_body', 'ranked_choice', 'results_group', 'seats', 'state', 'title', 'total_effected_precincts', 'total_votes_for_office', 'updated'],

    // Ranked choice places
    rankedChoiceTranslations: { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'nineth': 9, 'tenth': 10, 'final': 100 },

    // Contest id is model id
    //idAttribute: 'contest_id',

    // Initializer
    initialize: function(model, options) {
      this.options = options || {};
      this.app = options.app;

      // Changes that should come in from the API
      this.on('sync', this.contestUpdate);
    },

    // Construct API call
    url: function() {
      return this.app.options.electionsAPI +
        encodeURIComponent(this.query.replace('%CONTEST_ID%', this.id));
    },

    // Parse results
    parse: function(response, options) {
      var thisModel = this;
      var parsed = {};
      parsed.results = [];

      // Separate out what is contest level properties and what is
      // results
      _.each(response, function(r) {
        var result = {};
        _.each(r, function(v, k) {
          if (_.indexOf(thisModel.contestFields, k) >= 0) {
            parsed[k] = v;
          }
          else {
            result[k] = v;
          }
        });
        parsed.results.push(result);
      });

      // Ranked choice handling.  Group each candidate and add array
      // for results per rank
      if (parsed.ranked_choice) {
        var groupedResults = {};
        _.each(parsed.results, function(r) {
          _.each(thisModel.rankedChoiceTranslations, function(c, choice) {
            if (r.office_name.toLowerCase().indexOf(choice) > 0) {
              // Group the results
              groupedResults[r.candidate_id] = groupedResults[r.candidate_id] || {};
              groupedResults[r.candidate_id].ranked_choices = groupedResults[r.candidate_id].ranked_choices || {};
              groupedResults[r.candidate_id].ranked_choices[c] = {
                'ranked_choice': c,
                'percentage': r.percentage,
                'votes_candidate': r.votes_candidate,
                'office_name': r.office_name
              };

              // If the first choice, use this information to fill in results
              if (c === 1) {
                groupedResults[r.candidate_id] = _.extend(groupedResults[r.candidate_id], r);
              }
            }
          });
        });

        parsed.results = _.values(groupedResults);
      }

      // Put results in a basic order.
      parsed.results = _.sortBy(parsed.results, 'candidate');
      parsed.results = _.sortBy(parsed.results, function(r) {
        return r.percentage * -1;
      });


      // Mark who won.  For ranked-choice, this is complicated and we might not
      // even have that data, otherwise we need to make sure the number of
      // precincts reporting is full and check the number of seats available.
      if (parsed.precincts_reporting === parsed.total_effected_precincts) {
        if (parsed.ranked_choice) {
        }
        else {
          parsed.results = _.map(parsed.results, function(r, i) {
            r.winner = false;
            if (i < parsed.seats) {
              r.winner = true;
            }
            return r;
          });
        }
      }

      // Further formatting
      parsed.updated = moment.unix(parsed.updated);
      return parsed;
    },

    // When data comes is, handle it
    contestUpdate: function() {
      // Only handle once
      if (!this.get('fetchedBoundary') && _.isString(this.get('boundary'))) {
        this.fetchBoundary();
      }
    },

    // Gets boundary data from boundary service.  Unfortunately
    // some contests have multiple boundaries (issue with the
    // original boundary datasets)
    fetchBoundary: function() {
      var thisModel = this;

      $.jsonp({
        url: this.app.options.boundaryAPI + 'boundary/?slug__in=' +
          encodeURIComponent(this.get('boundary')) + '&callback=?'
      })
      .done(function(response) {
        if (_.isArray(response.objects)) {
          thisModel.set('boundarySets', response.objects);
          thisModel.set('fetchedBoundary', true);
        }
      });
    },

    // Our API is pretty simple, so we do a basic time based
    // polling.  Call right away as well.
    connect: function() {
      var thisModel = this;
      this.fetch();
      this.pollID = window.setInterval(function() {
        thisModel.fetch();
      }, 30000);
    },

    // Stop the polling
    disconnect: function() {
      window.clearInterval(this.pollID);
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);

/**
 * Models
 */
(function(App, $, undefined) {
  App.prototype.ContestsCollection = Backbone.Collection.extend({
    model: App.prototype.ContestModel,

    // Base query for the contest
    query: "SELECT * FROM contests AS c LEFT JOIN results AS r " +
      "ON c.contest_id = r.contest_id WHERE (%CONTEST_SEARCH%) " +
      "ORDER BY c.contest_id, r.percentage ASC LIMIT 400",

    // Construct API call
    url: function() {
      var filter = '';
      var searches = this.options.search.split('|');
      searches = _.map(searches, function(s) {
        s = s.split(' ').join('%');
        s = s.split('+').join('%');
        return "title LIKE '%" + s + "%'";
      });

      return this.app.options.electionsAPI +
        encodeURIComponent(this.query.replace('%CONTEST_SEARCH%', searches.join(' OR ')));
    },

    // Parse the results
    parse: function(response) {
      return _.values(_.groupBy(response, 'contest_id'));
    },

    initialize: function(models, options) {
      this.options = options || {};
      this.app = options.app;

      // Add references to options and app
      this.on('add', function(m) {
        m.options = options;
        m.app = options.app;
      });
      // When data comes in, react
      this.on('sync', function() {
        this.contestUpdate();
      });
    },

    // When data comes is, handle it
    contestUpdate: function() {
      // Only handle once
      if (!this.fetchedBoundary) {
        this.fetchBoundary();
      }
    },

    // Gets boundary data from boundary service in one call.
    fetchBoundary: function() {
      var thisCollection = this;

      $.jsonp({
        url: this.app.options.boundaryAPI + 'boundary/?slug__in=' +
          encodeURIComponent(this.pluck('boundary').join(',')) + '&callback=?'
      })
      .done(function(response) {
        if (_.isArray(response.objects)) {
          // Match up slugs to models
          _.each(response.objects, function(b) {
            thisCollection.filter(function(m) {
              return (m.get('boundary').indexOf(b.slug) >= 0);
            })[0].set('boundarySets', [b]);
          });
          thisCollection.fetchedBoundary = true;

          // Since Ractive's backbone adaptor does not seem to
          // react to properties that are not attributes of a model
          // or a model in a collection
          thisCollection.each(function(m) {
            m.set('fetchedBoundary', true);
          });
        }
      });
    },

    // Our API is pretty simple, so we do a basic time based
    // polling.  Call right away as well.
    connect: function() {
      var thisCollection = this;
      this.fetch();
      this.pollID = window.setInterval(function() {
        thisCollection.fetch();
      }, 30000);
    },

    // Stop the polling
    disconnect: function() {
      window.clearInterval(this.pollID);
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);

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

      boundaries = _.isArray(boundaries) ? boundaries : [boundaries];
      shapes = _.map(boundaries, function(b) {
        return b.simple_shape;
      });

      this.map = new L.Map(id, {
        zoom: 10,
        center: [44.9800, -93.2636],
        scrollWheelZoom: false
      });
      this.map.attributionControl.setPrefix(false);
      this.map.addLayer(new L.tileLayer('//{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png'));

      // Make GeoJSON layer from shapes
      featureGroup = new L.featureGroup();
      _.each(shapes, function(s) {
        var layer = new L.geoJson(s);
        // Set style here
        featureGroup.addLayer(layer);
      });
      this.map.addLayer(featureGroup);

      // Fit bounds breaks stuff because the geojson is not necessarily
      // fully loaded in the map, so we wrap this timer around it, as
      // Leaflet does not provide an sort of mechanism to allow us to know
      // when the layer is fully loaded
      window.setTimeout(function() {
        thisView.map.fitBounds(featureGroup.getBounds());
      }, 500);
    }
  });

  App.prototype.DashboardView = App.prototype.ContestBaseView.extend({
    init: function() {
    }
  });

  App.prototype.ContestView = App.prototype.ContestBaseView.extend({
    init: function() {
      this.set('classes', 'contest-view');

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

      this.observe('models.0.fetchedBoundary', function(newValue, oldValue) {
        var testModel = this.get('models.0.boundarySets');
        if (_.isArray(testModel) && _.isObject(testModel[0])) {
          _.each(this.get('models'), function(m) {
            _.each(m.get('boundarySets'), function(b) {
              shapes.push(b);
            });
          });
          this.makeMap('contests-map', shapes);
        }
      });
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);

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
      '*default': 'routeDefault'
    },

    start: function() {
      Backbone.history.start();
    },

    routeDefault: function() {
      this.navigate('/dashboard', { trigger: true, replace: true });
    },

    routeDashboard: function() {
      this.teardownObjects();

      // Get races objects
      this.app.dashboardView = new this.app.DashboardView({
        el: this.app.$el.find('.content-container'),
        template: this.app.template('template-dashboard'),
        data: {
        },
        partials: {
          loading: this.app.template('template-loading')
        },
        adaptors: [ 'Backbone' ]
      });
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
          contest: this.app.template('template-contest'),
          loading: this.app.template('template-loading')
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
        partials: {
          loading: this.app.template('template-loading')
        },
        adaptors: [ 'Backbone' ]
      });
    },

    // Tear down any existing objects
    teardownObjects: function() {
      var thisRouter = this;
      var views = ['contestView', 'contestsSearchView'];
      var models = ['contest', 'contestsSearch'];

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
})(mpApps['minnpost-elections-dashboard'], jQuery);