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

      $.ajax({
        dataType: 'jsonp',
        jsonpCallback: 'mpServerSideCachingHelper',
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