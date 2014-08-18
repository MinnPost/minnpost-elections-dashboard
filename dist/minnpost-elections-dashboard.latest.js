/**
 * Some helper functions
 */


/**
 * Helpers functions such as formatters or extensions
 * to libraries.
 */
define('helpers', ['jquery', 'underscore', 'backbone', 'moment', 'mpFormatters'],
  function($, _, Backbone, moment, formatters) {

  var helpers = {};
  var cacheURLIncrementer = {};

  /**
   * Override Backbone's ajax call to use JSONP by default as well
   * as force a specific callback to ensure that server side
   * caching is effective.
   */
  helpers.overrideBackboneAJAX = function() {
    Backbone.ajax = function() {
      var options = arguments;
      var hash;

      if (options[0].dataTypeForce !== true) {
        hash = formatters.hash(options[0].url);
        cacheURLIncrementer[hash] = (!_.isUndefined(cacheURLIncrementer[hash])) ?
          cacheURLIncrementer[hash] + 1 : 0;
        options[0].dataType = 'jsonp';
        options[0].jsonpCallback = 'mpServerSideCachingHelper' + hash +
          cacheURLIncrementer[hash];
      }
      return Backbone.$.ajax.apply(Backbone.$, options);
    };
  };

  /**
   * Add today formatting option function to moment.
   * See: http://stackoverflow.com/questions/10291495/moment-js-display-either-date-or-time
   */
  if (_.isObject(moment)) {
    moment.fn.formatToday = function(todayFormat, otherFormat) {
      var now = moment();
      todayFormat = todayFormat || '[at] h:mm a';
      otherFormat = otherFormat || '[on] MMM DD';

      if (this.date() === now.date() && Math.abs(this.diff(now)) < 86400000) {
        // same day of month and less than 24 hours difference
        return this.format(todayFormat);
      }
      else {
        return this.format(otherFormat);
      }
    };
  }

  /**
   * Returns version of MSIE.
   */
  helpers.isMSIE = function() {
    var match = /(msie) ([\w.]+)/i.exec(navigator.userAgent);
    return match ? parseInt(match[2], 10) : false;
  };

  /**
   * Wrapper for a JSONP request, the first set of options are for
   * the AJAX request, while the other are from the application.
   */
  helpers.jsonpRequest = function(requestOptions, appOptions) {
    var options = requestOptions;

    if (options.dataTypeForce !== true) {
      hash = formatters.hash(options.url);
      cacheURLIncrementer[hash] = (!_.isUndefined(cacheURLIncrementer[hash])) ?
        cacheURLIncrementer[hash] + 1 : 0;
      options.dataType = 'jsonp';
      options.jsonpCallback = 'mpServerSideCachingHelper' + hash +
        cacheURLIncrementer[hash];
    }

    return $.ajax.apply($, [options]);
  };

  /**
   * Data source handling.  For development, we can call
   * the data directly from the JSON file, but for production
   * we want to proxy for JSONP.
   *
   * `name` should be relative path to dataset
   * `options` are app options
   *
   * Returns jQuery's defferred object.
   */
  helpers.getLocalData = function(name, options) {
    var useJSONP = false;
    var defers = [];
    name = (_.isArray(name)) ? name : [ name ];

    // If the data path is not relative, then use JSONP
    if (options && options.paths && options.paths.data.indexOf('http') === 0) {
      useJSONP = true;
    }

    // Go through each file and add to defers
    _.each(name, function(d) {
      var defer;

      if (useJSONP) {
        defer = helpers.jsonpRequest({
          url: proxyPrefix + encodeURI(options.paths.data + d)
        }, options);
      }
      else {
        defer = $.getJSON(options.paths.data + d);
      }
      defers.push(defer);
    });

    return $.when.apply($, defers);
  };

  /**
   * Reads query string and turns into object.
   */
  helpers.parseQueryString = function() {
    var assoc  = {};
    var decode = function(s) {
      return decodeURIComponent(s.replace(/\+/g, " "));
    };
    var queryString = location.search.substring(1);
    var keyValues = queryString.split('&');

    _.each(keyValues, function(v, vi) {
      var key = v.split('=');
      if (key.length > 1) {
        assoc[decode(key[0])] = decode(key[1]);
      }
    });

    return assoc;
  };

  return helpers;
});

/**
 * Models
 */
define('models',[
  'jquery', 'underscore', 'backbone', 'moment', 'moment-timezone', 'helpers'
], function($, _, Backbone, moment, momentTimezone, helpers) {
  var models = {};

  models.ContestModel = Backbone.Model.extend({
    // Base query for the contest
    query: "SELECT r.*, c.* FROM contests AS c LEFT JOIN results AS r " +
      "ON c.id = r.contest_id WHERE c.id = '%CONTEST_ID%' " +
      "ORDER BY r.percentage ASC, r.candidate",

    // Fields that are for contests (not result)
    contestFields: ['id', 'contest_id', 'boundary', 'county_id', 'district_code', 'office_id', 'precinct_id', 'precincts_reporting', 'question_body', 'ranked_choice', 'results_group', 'seats', 'state', 'title', 'total_effected_precincts', 'total_votes_for_office', 'updated', 'question_body', 'question_help', 'primary', 'scope', 'partisan'],

    // Non-Partisan parties
    npParties: ['NP', 'WI'],

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
      var rankedChoiceFinal = false;
      parsed.results = [];

      // Given how collections process fetching new data, we want to avoid
      // parsing here and parse on the collection part
      if (options.collection) {
        return response;
      }

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
          var c = r.ranked_choice_place;
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

          // If the final choice, get some values
          if (c === 100) {
            groupedResults[r.candidate_id].percentage = r.percentage;
            groupedResults[r.candidate_id].votes_candidate = r.votes_candidate;
          }
        });
        parsed.results = _.values(groupedResults);
      }

      // Put results in a basic order.
      parsed.results = _.sortBy(parsed.results, 'candidate');
      parsed.results = _.sortBy(parsed.results, function(r) {
        return r.percentage * -1;
      });
      // If primary, sort by party
      if (parsed.primary) {
        parsed.results = _.sortBy(parsed.results, 'party_id');
      }

      // Mark who won.  Overall having all precincts reporting is good
      // enough but with ranked choice, we need have all the final data
      // in.  Primaries need to choose winners per parties
      parsed.done = (parsed.precincts_reporting === parsed.total_effected_precincts);

      if (parsed.ranked_choice) {
        rankedChoiceFinal = (_.size(parsed.results) == _.size(_.filter(parsed.results, function(r) {
          return (!_.isUndefined(r.ranked_choices[100]));
        })));
      }
      if ((parsed.done && !parsed.ranked_choice && !parsed.primary) ||
        (parsed.done && parsed.ranked_choice && rankedChoiceFinal && !parsed.primary) ||
        (parsed.done && parsed.primary && !parsed.partisan)) {
        parsed.results = _.map(parsed.results, function(r, ri) {
          r.winner = false;
          if (ri < parsed.seats) {
            r.winner = true;
          }
          return r;
        });
        parsed.final = true;
      }
      else if (parsed.done && parsed.primary && parsed.partisan) {
        _.each(_.groupBy(parsed.results, 'party_id'), function(p, pi) {
          _.each(p, function(r, ri) {
            r.winner = false;
            if (ri < parsed.seats) {
              r.winner = true;
            }
            return r;
          });
        });

        parsed.final = true;
      }

      // Further formatting
      parsed.updated = moment.unix(parsed.updated);
      return parsed;
    },

    // When data comes is, handle it
    contestUpdate: function() {
      this.set('synced', true);

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

      helpers.jsonpRequest({
        url: this.app.options.boundaryAPI + 'boundary/?limit=10&slug__in=' +
          encodeURIComponent(this.get('boundary'))
      }, this.app.options)
      .done(function(response) {
        if (_.isArray(response.objects)) {
          thisModel.set('boundarySets', response.objects);
          thisModel.set('fetchedBoundary', true);
        }
      });
    },

    // Our API is pretty simple, so we do a basic time based
    // polling.  Call right away as well.
    connect: function(fetchBoundary) {
      var thisModel = this;

      // Allow to turn off boundary fetching
      this.set('fetchedBoundary', (fetchBoundary !== false) ? false : true);

      this.fetch();
      this.pollID = window.setInterval(function() {
        thisModel.fetch();
      }, this.app.options.electionsAPIPollInterval);
    },

    // Stop the polling
    disconnect: function() {
      window.clearInterval(this.pollID);
    }
  });


  // Model for election wide data
  models.ElectionModel = Backbone.Model.extend({
    // Base query for the metadata
    query: "SELECT * FROM swvariables",

    // Initializer
    initialize: function(model, options) {
      this.options = options || {};
      this.app = options.app;
    },

    // Construct API call
    url: function() {
      return this.app.options.electionsAPI +
        encodeURIComponent(this.query);
    },

    // Parse results
    parse: function(response, options) {
      var parsed = {};
      var now, testStop;

      // Parse out values
      _.each(response, function(r, ri) {
        // Parsing large ints in JS :(
        if (r.type === 'integer') {
          parsed[r.name] = parseInt(r.value_blob, 10);
        }
        else if (r.type === 'float') {
          parsed[r.name] = parseFloat(r.value_blob);
        }
        else if (r.type === 'boolean') {
          parsed[r.name] = !!r.value_blob;
        }
        else {
          parsed[r.name] = r.value_blob;
        }
      });

      // Some specifics
      if (parsed.date) {
        parsed.date = moment(parsed.date);
      }
      if (parsed.updated) {
        parsed.updated = moment.unix(parsed.updated);
      }

      // If we have a date for the election, make a good guess on whether
      // we are looking at test results.  Unofficialy, the numbers should
      // be zeroed by 3pm
      parsed.isTest = false;
      if (parsed.date) {
        now = moment().tz('America/Chicago');
        testStop = parsed.date.clone();
        testStop.tz('America/Chicago').hour(15).minute(0);
        if (now.isBefore(testStop, 'minute')) {
          parsed.isTest = true;
        }
      }

      return parsed;
    },

    // Our API is pretty simple, so we do a basic time based
    // polling.  Call right away as well.
    connect: function() {
      var thisModel = this;
      this.fetch();
      this.pollID = window.setInterval(function() {
        thisModel.fetch();
      }, this.app.options.electionsAPIPollInterval);
    },

    // Stop the polling
    disconnect: function() {
      window.clearInterval(this.pollID);
    }
  });


  return models;

});

/**
 * Collections
 */
define('collections',[
  'jquery', 'underscore', 'backbone', 'models', 'helpers'
], function($, _, Backbone, models, helpers) {

  var collections = {};

  collections.ContestsCollection = Backbone.Collection.extend({
    model: models.ContestModel,

    // Base query for the contest
    query: "SELECT r.*, c.* FROM contests AS c LEFT JOIN results AS r " +
      "ON c.id = r.contest_id WHERE (%CONTEST_SEARCH%) " +
      "ORDER BY c.title, r.percentage, r.candidate ASC LIMIT 400",

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

    // Parse the results.
    parse: function(response, options) {
      // How backbone handles parsing is not helpful given our structure; it'll
      // pass the model-level parsing but only after it has looked to see if
      // the model should be added or updated to the collection.  So, we do
      // parsing here and avoid it on the model.  Luckily backbone passes
      // a 'collection' option to check for.
      var parsed = _.map(_.values(_.groupBy(response, 'id')),
        this.model.prototype.parse, this.model.prototype);
      return parsed;
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

      helpers.jsonpRequest({
        url: this.app.options.boundaryAPI + 'boundary/?limit=30&slug__in=' +
          encodeURIComponent(this.pluck('boundary').join(','))
      }, this.app.options)
      .done(function(response) {
        if (_.isArray(response.objects)) {
          // Match up slugs to models
          _.each(response.objects, function(b) {
            _.each(thisCollection.filter(function(m) {
              return (m.get('boundary').indexOf(b.slug) >= 0);
            }), function(m) {
              m.set('boundarySets', [b]);
            });
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
      var fetchOptions = { collection: true };

      this.fetch(fetchOptions);
      this.pollID = window.setInterval(function() {
        thisCollection.fetch(fetchOptions);
      }, this.app.options.electionsAPIPollInterval);
    },

    // Stop the polling
    disconnect: function() {
      window.clearInterval(this.pollID);
    }
  });

  // A collection based a location
  collections.ContestsLocationCollection = collections.ContestsCollection.extend({

    // Base query for the contest
    query: "SELECT r.*, c.* FROM contests AS c LEFT JOIN results AS r " +
      "ON c.id = r.contest_id WHERE boundary IN (%CONTEST_SEARCH%) " +
      "ORDER BY c.title, r.percentage, r.candidate ASC LIMIT 400",

    // Construct API call
    url: function() {
      return this.app.options.electionsAPI +
        encodeURIComponent(this.query.replace('%CONTEST_SEARCH%',
          "'" + this.boundaries.join("','") + "'"));
    },

    initialize: function(models, options) {
      // Call parent intializer
      collections.ContestsLocationCollection.__super__.initialize.apply(this, arguments);

      this.on('fetchedBoundary', function() {
        this.connect();
      });
    },

    // Override this, as we actually get the boundaries first
    contestUpdate: function() {
      // Only handle once
      if (!this.matchedBoundary) {
        this.matchBoundary();
      }
    },

    // Match the already recieved boundaries
    matchBoundary: function() {
      var thisCollection = this;
      _.each(this.fullBoundaries, function(b) {
        _.each(thisCollection.where({ boundary: b.slug }), function(m) {
          m.set('boundarySets', [b]);
        });
      });

      // Since Ractive's backbone adaptor does not seem to
      // react to properties that are not attributes of a model
      // or a model in a collection
      this.each(function(m) {
        m.set('fetchedBoundary', true);
      });

      this.matchedBoundary = true;
    },

    // Get Bundaries from coordinates
    fetchBoundaryFromCoordinates: function() {
      var thisCollection = this;

      helpers.jsonpRequest({
        url: this.app.options.boundaryAPI + 'boundary/?contains=' +
          encodeURIComponent(this.options.lonlat[1]) + ',' +
          encodeURIComponent(this.options.lonlat[0]) + '&sets=' +
          encodeURIComponent(this.app.options.boundarySets.join(','))
      }, this.app.options)
      .done(function(response) {
        if (_.isArray(response.objects)) {
          thisCollection.fullBoundaries = response.objects;
          thisCollection.boundaries = _.pluck(response.objects, 'slug');
          thisCollection.trigger('fetchedBoundary');
        }
      });
    }
  });

  return collections;

});


define('text!templates/application.mustache',[],function () { return '<div class="message-container"></div>\n\n<div class="content-container"></div>\n\n<div class="footnote-container"></div>';});


define('text!templates/footnote.mustache',[],function () { return '<div class="footnote">\n  <p>Unofficial election data provided by the <a href="http://www.sos.state.mn.us/" target="_blank">MN Secretary of State</a>.  For ranked-choice contests data is supplemented manually from the <a href="http://vote.minneapolismn.gov/" target="_blank">City of Minneapolis</a> and the <a href="http://www.stpaul.gov/index.aspx?NID=188" target="_blank">City of St. Paul</a>.  Test data will be provided until 8PM on Election Night.</p>\n\n  <p>The geographical boundaries, though received from official sources and queried from our <a href="http://boundaries.minnpost.com" target="_blank">boundary service</a>, may not represent the exact, offical area for a contest, race, or election.  It is also possible that for a given location the contests may not be accurate due to data quality with multiple agencies.  Please refer to your local and state election officials to know exactly what contests happen for a given location.</p>\n\n  <p>Some map data © OpenStreetMap contributors; licensed under the <a href="http://www.openstreetmap.org/copyright" target="_blank">Open Data Commons Open Database License</a>.  Some map design © MapBox; licensed according to the <a href="http://mapbox.com/tos/" target="_blank">MapBox Terms of Service</a>.  Location geocoding provided by <a href="http://www.mapquest.com/" target="_blank">Mapquest</a> and is not guaranteed to be accurate.</p>\n\n  <p>Some code, techniques, and data on <a href="https://github.com/minnpost/minnpost-elections-dashboard" target="_blank">Github</a>.</p>\n</div>\n';});


define('text!templates/contest.mustache',[],function () { return '<div class="contest {{#isDashboard}}dashboard-contest{{/isDashboard}} {{ classes }} {{#(ranked_choice == 1)}}is-ranked-choice {{/()}}{{#(final === true)}}is-final{{/()}} {{#primary}}primary{{/primary}}">\n  {{^isDashboard}}\n    <a class="dashboard-link" href="#dashboard">&larr; Back to dashboard</a>\n  {{/isDashboard}}\n\n  <div>\n    {{#((results.length == 0 || results == undefined) && !synced)}}\n      {{>loading}}\n    {{/()}}\n  </div>\n\n  {{#((results.length == 0 || results == undefined) && synced)}}\n    <h3>Did not find any contests</h3>\n  {{/()}}\n\n\n  {{#((results.length > 0) && synced)}}\n    <h3>\n      {{ title }}\n      {{#(show_party != undefined)}}<span class="show-party party-label bg-color-political-{{ show_party.toLowerCase() }}" title="{{ parties[show_party.toLowerCase()] }}">{{ show_party }}</span>{{/()}}\n    </h3>\n\n    {{^isDashboard}}\n      <div class="last-updated">Last updated {{ updated.formatToday() }}</div>\n    {{/isDashboard}}\n\n    {{#(!!question_body)}}\n      <p>{{{ question_body }}}</p>\n    {{/()}}\n  {{/()}}\n\n  <div class="{{^isDashboard}}row{{/isDashboard}}">\n    <div class="{{^isDashboard}}column-medium-70 inner-column-left{{/isDashboard}}">\n      <div class="">\n        <table class="striped">\n          <thead>\n            <tr class="table-first-heading">\n              <th class="winner-column"></th>\n              <th>Candidate</th>\n              {{#(partisan && show_party === undefined)}}\n                <th>\n                  <span class="large-table-label">Party</span>\n                  <span class="small-table-label"></span>\n                </th>\n              {{/()}}\n              {{#(ranked_choice == 1)}}\n                <th class="first-choice-column">Results</th>\n                <th class="second-choice-column"></th>\n                <th class="third-choice-column"></th>\n                <th class="final-column">Final</th>\n              {{/()}}\n              {{#(ranked_choice != 1)}}\n                {{^isDashboard}}\n                  <th class="percentage">\n                    <span class="large-table-label">Percentage</span>\n                    <span class="small-table-label">%</span>\n                  </th>\n                  <th class="votes">Votes</th>\n                {{/isDashboard}}\n                {{#isDashboard}}\n                  <th class="percentage">Results</th>\n                {{/isDashboard}}\n              {{/()}}\n            </tr>\n            <tr class="table-second-heading">\n              <th class="winner-column"></th>\n              <th>{{ precincts_reporting }} of {{ total_effected_precincts }} precincts reporting.  {{#(seats > 1)}}Choosing {{ seats }}.{{/()}}</th>\n              {{#(partisan && show_party === undefined)}}\n                <th></th>\n              {{/()}}\n              {{#(ranked_choice == 1)}}\n                <th class="first-choice-column first-choice-heading">1st choice</th>\n                <th class="second-choice-column second-choice-heading">2nd choice</th>\n                <th class="third-choice-column third-choice-heading">3rd choice</th>\n                <th class="final-column"></th>\n              {{/()}}\n              {{#(ranked_choice != 1)}}\n                <th></th>\n                {{^isDashboard}}\n                  <th></th>\n                {{/isDashboard}}\n              {{/()}}\n            </tr>\n          </thead>\n\n          <tbody>\n            {{#results:r}} {{#(!isDashboard || ((show_party == undefined && (r < 2 || (rows != undefined && r < rows))) || (show_party != undefined && party_id == show_party)))}}\n              <tr data-row-id="{{ id }}" class="{{ (r % 2 === 0) ? \'even\' : \'odd\' }} {{#primary}}{{ party_id.toLowerCase() }}{{/primary}}">\n                <td class="winner-column">{{#winner}}<span class="fa fa-check"></span>{{/winner}}</td>\n\n                <td class="candidate-column">{{ candidate }}</td>\n\n                {{#(partisan && show_party === undefined)}}\n                  <td><span class="party-label bg-color-political-{{ party_id.toLowerCase() }}" title="{{ parties[party_id.toLowerCase()] }}">{{ party_id }}</span></td>\n                {{/()}}\n\n                {{#(ranked_choice == 1)}}\n                  <td class="first-choice-column first-choice-heading">{{ formatters.number(ranked_choices.1.percentage) }}% ({{ formatters.number(ranked_choices.1.votes_candidate, 0) }}&nbsp;votes)</td>\n                  <td class="second-choice-column first-choice-heading">{{ formatters.number(ranked_choices.2.percentage) }}% ({{ formatters.number(ranked_choices.2.votes_candidate, 0) }}&nbsp;votes)</td>\n                  <td class="third-choice-column first-choice-heading">{{ formatters.number(ranked_choices.3.percentage) }}% ({{ formatters.number(ranked_choices.3.votes_candidate, 0) }}&nbsp;votes)</td>\n                  <td class="final-column first-choice-heading">{{#ranked_choices.100.percentage}}{{ formatters.number(ranked_choices.100.percentage) }}% ({{ formatters.number(ranked_choices.100.votes_candidate, 0) }}&nbsp;votes){{/ranked_choices.100.percentage}}{{^ranked_choices.100.percentage}}&mdash;{{/ranked_choices.100.percentage}}</td>\n                {{/()}}\n\n                {{#(ranked_choice != 1)}}\n                  <td class="percentage">{{ formatters.number(percentage) }}%</td>\n                  {{^isDashboard}}\n                    <td class="votes">{{ formatters.number(votes_candidate, 0) }}</td>\n                  {{/isDashboard}}\n                {{/()}}\n              </tr>\n            {{/()}} {{/results}}\n          </tbody>\n        </table>\n      </div>\n\n      <a href="#contest/{{ id }}" class="contest-link">{{#isDashboard}}Full results{{/isDashboard}}{{^isDashboard}}Permalink{{/isDashboard}}</a>\n    </div>\n\n    {{^isDashboard}}\n      <div class="column-medium-30 inner-column-right">\n        <div class="contest-map" id="contest-map-{{ id }}"></div>\n      </div>\n    {{/isDashboard}}\n  </div>\n</div>\n';});


define('text!templates/contests.mustache',[],function () { return '<div class="contests">\n  <a class="dashboard-link" href="#dashboard">&larr; Back to dashboard</a>\n\n  <div class="row">\n    <div class="column-medium-70 inner-column-left contests-title-section">\n      <h2 class="contests-title {{#(lonlat != undefined)}}with-location{{/()}}">{{ (title) ? title : \'Contests\' }}</h2>\n\n      <p class="caption">\n        Found\n          {{#(models.length == 0 && !synced)}}\n            <i class="loading small"></i>\n          {{/())}}\n          {{#synced}}\n            {{ models.length }}\n          {{/synced}}\n        results.\n      </p>\n\n      {{#(lonlat != undefined)}}\n        <p class="caption">The map below shows the approximate location of your search. If the location is not correct, try <a href="#dashboard">searching for a more specific address</a>.</p>\n\n        <div id="location-map"></div>\n      {{/())}}\n    </div>\n\n    <div class="column-medium-30 inner-column-right"></div>\n  </div>\n\n  <div>\n    {{#(models.length == 0 && !synced)}}\n      {{>loading}}\n    {{/())}}\n\n    {{#(models.length == 0 && synced)}}\n      <p class="large">Unable to find any contests.</p>\n    {{/())}}\n  </div>\n\n  <div class="contest-list">\n    {{#models:i}}\n      {{>contest}}\n    {{/models}}\n  </div>\n</div>\n';});


define('text!templates/dashboard.mustache',[],function () { return '<div class="dashboard {{ classes }}">\n\n  <div class="location-search-section">\n    <form role="form" class="" on-submit="addresssSearch">\n\n      <div class="location-search-group">\n        <div class="form-input-group">\n          <label for="address" class="sr-only">Search address for results</label>\n          <input type="text" id="address-search" placeholder="Search address for results">\n\n          <div class="button-group">\n            <button type="submit" class="button primary address-search-submit">Search</button>\n          </div>\n        </div>\n      </div>\n\n      {{#geolocationEnabled}}\n        <div class="geolocation">\n          <a href="#location">Or view contests at your current location <i class="fa fa-location-arrow"></i></a>\n        </div>\n      {{/geolocationEnabled}}\n    </form>\n  </div>\n\n  <div class="last-updated-section">\n    <div>\n      {{#election.date}}\n        {{ election.date.format(\'MMM DD, YYYY\') }} {{ (election.primary) ? \'primary\' : \'general\' }} election {{#election.isTest}}<em>test</em>{{/election.isTest}} results.\n      {{/election.date}}\n      {{#election.updated}}\n        Last updated {{ election.updated.formatToday() }}\n      {{/election.updated}}\n    </div>\n  </div>\n\n  <div class="row">\n    <div class="column-medium-50">\n      <div class="inner-column-left">\n\n        <div class="contest-governor-r dashboard-section">\n          {{#contestGovernorR}}\n            {{>contest}}\n          {{/contestGovernorR}}\n        </div>\n\n        <div class="contest-auditor-dfl dashboard-section">\n          {{#contestAuditorDFL}}\n            {{>contest}}\n          {{/contestAuditorDFL}}\n        </div>\n\n        <div class="elections-search dashboard-section">\n          <h4>Other elections</h4>\n          {{>electionsSearch}}\n        </div>\n      </div>\n    </div>\n\n    <div class="column-medium-50">\n      <div class="inner-column-right">\n\n        <div class="contest-senate-r dashboard-section">\n          {{#contestSenateR}}\n            {{>contest}}\n          {{/contestSenateR}}\n        </div>\n\n        <div class="contest-house-60b-dfl dashboard-section">\n          {{#contestHouse60BDFL}}\n            {{>contest}}\n          {{/contestHouse60BDFL}}\n        </div>\n\n        <div class="contest-house-48b-r dashboard-section">\n          {{#contestHouse48BR}}\n            {{>contest}}\n          {{/contestHouse48BR}}\n        </div>\n\n        <div class="elections-search dashboard-section">\n          <h4>Other elections</h4>\n          {{>electionsSearch}}\n        </div>\n\n      </div>\n    </div>\n  </div>\n</div>\n';});


define('text!templates/loading.mustache',[],function () { return '<div class="loading-container">\n  <i class="loading"></i> Loading...\n</div> \n';});


define('text!templates/elections-search-form.mustache',[],function () { return '<form role="form" class="" on-submit="contestSearch">\n\n  <p class="caption" for="contest-search">{{#capabilities.typeahead}}Search contests by title or candidate.  Start typing to see suggestions for specific contests, or search by {{/capabilities.typeahead}}{{^capabilities.typeahead}}Search contests by title with {{/capabilities.typeahead}} keywords (e.g., "<a href="#search/state+representative">state representative</a>" or "<a href="#search/school+board">school board</a>").</p>\n\n  <div class="form-input-group">\n    <input type="text" class="contest-search" placeholder="Search by title{{#capabilities.typeahead}} or candidate{{/capabilities.typeahead}}" />\n\n    <div class="button-group">\n      <button type="submit" class="button primary contest-search-submit">Search</button>\n    </div>\n  </div>\n</form>\n';});

/**
 * Views
 */

define('views',[
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

/**
 * Routers
 */
define('routers',[
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
        var $input = $(e.node).find('.contest-search.tt-input');
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
          delete thisRouter.app[v];
        }
      });
    }
  });

  return routers;
});

/**
 * Main application file for: minnpost-elections-dashboard
 *
 * This pulls in all the parts
 * and creates the main object for the application.
 */

// Create main application
define('minnpost-elections-dashboard', [
  'jquery', 'underscore', 'ractive', 'mpConfig', 'mpFormatters',
  'helpers', 'views', 'routers'
], function(
  $, _, Ractive, mpConfig, mpFormatters,
  helpers, views, routers
  ) {

  // Constructor for app
  var App = function(options) {
    this.options = _.extend(this.defaultOptions, options);
    this.el = this.options.el;
    this.$el = $(this.el);
    this.$ = function(selector) { return this.$el.find(selector); };
    this.$content = this.$el.find('.content-container');
    this.loadApp();
  };

  // Extend with custom methods
  _.extend(App.prototype, {
    // Start function
    start: function() {
      var thisApp = this;

      // Override Backbone's AJAX
      helpers.overrideBackboneAJAX();

      // Render the container and "static" templates.
      this.applicationView = new views.ApplicationView({
        el: this.$el
      });
      thisApp.footnoteView = new views.FootnoteView({
        el: this.$el.find('.footnote-container')
      });

      // Create router which will handle most of the high
      // level logic
      this.router = new routers.DashboardRouter(_.extend(this.options, { app: this }));
      this.router.start();

      // Try to ensure that links are prevented from their default
      // behavior.  Sometimes because of Ractive's dom insertions, the
      // preventDefault is not handled correctly
      if (this.options.capabilities.preventLinks) {
        $('a[href^="#"]').on('click', this.$el, function(e) {
          e.preventDefault();
          thisApp.router.navigate($(this).attr('href'), { trigger: true });
        });
      }

      //helpers.getLocalData('neighborhood-stop-data.topo.json', this.options).done(function(data) {
    },

    // Default options
    defaultOptions: {
      projectName: 'minnpost-elections-dashboard',
      remoteProxy: '//mp-jsonproxy.herokuapp.com/proxy?callback=?&url=',
      el: '.minnpost-elections-dashboard-container',
      electionsAPIPollInterval: 50000,
      electionsAPI: '//premium.scraperwiki.com/ez47yoa/aaff8e67f921428/sql/?q=',
      electionsAPILocal: '//localhost:5000/?q=',
      electionsAPIEC2: '//50.19.100.197/?box=ubuntu&method=sql&q=',
      electionsAPIScraperWiki: '//premium.scraperwiki.com/ez47yoa/aaff8e67f921428/sql/?q=',
      boundaryAPI: '//boundaries.minnpost.com/1.0/',
      boundarySets: [
        'counties-2010',
        'minor-civil-divisions-2010',
        'school-districts-2013',
        'wards-2012',
        'state-house-districts-2012',
        'state-senate-districts-2012',
        'minnesota-state-2014',
        'district-courts-2012'
      ],
      // Please don't steal/abuse
      mapQuestKey: 'Fmjtd%7Cluur20a7n0%2C8n%3Do5-9a1s9f',
      mapQuestQuery: '//open.mapquestapi.com/geocoding/v1/address?key=[[[KEY]]]&outFormat=json&countrycodes=us&maxResults=1&location=[[[ADDRESS]]]',
      originalTitle: document.title,
      capabilities: {
        typeahead: true, //(helpers.isMSIE() !== 9),
        preventLinks: (!helpers.isMSIE() && helpers.isMSIE() <= 9)
      },
      availablePaths: {
        local: {
          css: ['.tmp/css/main.css'],
          images: 'images/',
          data: 'data/'
        },
        build: {
          css: [
            '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css',
            'dist/minnpost-elections-dashboard.libs.min.css',
            'dist/minnpost-elections-dashboard.latest.min.css'
          ],
          ie: [
            'dist/minnpost-elections-dashboard.libs.min.ie.css',
            'dist/minnpost-elections-dashboard.latest.min.ie.css'
          ],
          images: 'dist/images/',
          data: 'dist/data/'
        },
        deploy: {
          css: [
            '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css',
            '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/minnpost-elections-dashboard.libs.min.css',
            '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/minnpost-elections-dashboard.latest.min.css'
          ],
          ie: [
            '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/minnpost-elections-dashboard.libs.min.ie.css',
            '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/minnpost-elections-dashboard.latest.min.ie.css'
          ],
          images: '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/images/',
          data: '//s3.amazonaws.com/data.minnpost/projects/minnpost-elections-dashboard/data/'
        }
      }
    },

    // Load up app
    loadApp: function() {
      this.determinePaths();
      this.getLocalAssests(function(map) {
        this.renderAssests(map);
        this.start();
      });
    },

    // Determine paths.  A bit hacky.
    determinePaths: function() {
      var query;
      this.options.deployment = 'deploy';

      if (window.location.host.indexOf('localhost') !== -1) {
        this.options.deployment = 'local';

        // Check if a query string forces something
        query = helpers.parseQueryString();
        if (_.isObject(query) && _.isString(query.mpDeployment)) {
          this.options.deployment = query.mpDeployment;
        }
      }

      this.options.paths = this.options.availablePaths[this.options.deployment];
    },

    // Get local assests, if needed
    getLocalAssests: function(callback) {
      var thisApp = this;

      // If local read in the bower map
      if (this.options.deployment === 'local') {
        $.getJSON('bower.json', function(data) {
          callback.apply(thisApp, [data.dependencyMap]);
        });
      }
      else {
        callback.apply(this, []);
      }
    },

    // Rendering tasks
    renderAssests: function(map) {
      var isIE = (helpers.isMSIE() && helpers.isMSIE() <= 8);

      // Add CSS from bower map
      if (_.isObject(map)) {
        _.each(map, function(c, ci) {
          if (c.css) {
            _.each(c.css, function(s, si) {
              s = (s.match(/^(http|\/\/)/)) ? s : 'bower_components/' + s + '.css';
              $('head').append('<link rel="stylesheet" href="' + s + '" type="text/css" />');
            });
          }
          if (c.ie && isIE) {
            _.each(c.ie, function(s, si) {
              s = (s.match(/^(http|\/\/)/)) ? s : 'bower_components/' + s + '.css';
              $('head').append('<link rel="stylesheet" href="' + s + '" type="text/css" />');
            });
          }
        });
      }

      // Get main CSS
      _.each(this.options.paths.css, function(c, ci) {
        $('head').append('<link rel="stylesheet" href="' + c + '" type="text/css" />');
      });
      if (isIE) {
        _.each(this.options.paths.ie, function(c, ci) {
          $('head').append('<link rel="stylesheet" href="' + c + '" type="text/css" />');
        });
      }

      // Add a processed class
      this.$el.addClass('processed');
    }
  });

  return App;
});


/**
 * Run application
 */
require(['jquery', 'minnpost-elections-dashboard'], function($, App) {
  $(document).ready(function() {
    var app = new App();
  });
});

