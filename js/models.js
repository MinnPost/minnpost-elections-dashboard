/**
 * Models
 */
(function(App, $, undefined) {
  App.prototype.ContestModel = Backbone.Model.extend({
    // Base query for the contest
    query: "SELECT * FROM contests AS c LEFT JOIN results AS r " +
      "ON c.contest_id = r.contest_id WHERE c.contest_id = '%CONTEST_ID%'",

    // Fields that are for contests (not result)
    contestFields: ['boundary', 'contest_id', 'contest_id_name', 'county_id', 'district_code', 'office_id', 'office_name', 'office_name_id', 'precinct_id', 'precincts_reporting', 'question_body', 'ranked_choice', 'results_group', 'seats', 'state', 'title', 'total_effected_precincts', 'total_votes_for_office', 'updated'],

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

      parsed.results = _.sortBy(parsed.results, 'percentage');
      return parsed;
    },

    initialize: function(model, options) {
      this.app = options.app;
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);