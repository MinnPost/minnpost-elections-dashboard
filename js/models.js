/**
 * Models
 */
(function(App, $, undefined) {
  App.prototype.ContestModel = Backbone.Model.extend({
    // Base query for the contest
    query: "SELECT r.*, c.* FROM contests AS c LEFT JOIN results AS r " +
      "ON c.id = r.contest_id WHERE c.id = '%CONTEST_ID%' " +
      "ORDER BY r.percentage ASC, r.candidate",

    // Fields that are for contests (not result)
    contestFields: ['id', 'contest_id', 'boundary', 'county_id', 'district_code', 'office_id', 'precinct_id', 'precincts_reporting', 'question_body', 'ranked_choice', 'results_group', 'seats', 'state', 'title', 'total_effected_precincts', 'total_votes_for_office', 'updated', 'question_body', 'question_help'],

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

      // Partison by default, unless we find a party
      parsed.partisan = (_.findWhere(parsed.results, function(r, ri) {
        return (_.indexOf(thisModel.npParties, r.party) >= 0);
      })) ? true : false;

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

      this.app.jsonpRequest({
        url: this.app.options.boundaryAPI + 'boundary/?slug__in=' +
          encodeURIComponent(this.get('boundary'))
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
    connect: function(fetchBoundary) {
      var thisModel = this;

      this.set('fetchedBoundary', (fetchBoundary !== false) ? false : true);
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