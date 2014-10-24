/**
 * Models
 */
define([
  'jquery', 'underscore', 'backbone', 'moment', 'moment-timezone', 'helpers'
], function($, _, Backbone, moment, momentTimezone, helpers) {
  var models = {};

  models.ContestModel = Backbone.Model.extend({
    // Base query for the contest
    query: "SELECT r.*, c.* FROM contests AS c LEFT JOIN results AS r " +
      "ON c.id = r.contest_id WHERE c.id = '%CONTEST_ID%' " +
      "ORDER BY r.percentage ASC, r.candidate",

    // Fields that are for contests (not result)
    contestFields: ['id', 'contest_id', 'boundary', 'county_id', 'district_code', 'office_id', 'precinct_id', 'precincts_reporting', 'question_body', 'ranked_choice', 'results_group', 'seats', 'state', 'title', 'sub_title', 'total_effected_precincts', 'total_votes_for_office', 'updated', 'question_body', 'question_help', 'primary', 'scope', 'partisan'],

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
