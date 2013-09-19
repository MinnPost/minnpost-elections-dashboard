/**
 * Models
 */
(function(app, $, undefined) {
  app.prototype.RaceModel =  Backbone.Model.extend({
    url: function() {
      return baseAPIURL + encodeURI("SELECT * FROM results_general WHERE race_id = '" +
        this.get('race_id') + "' LIMIT 100");
    },

    blankCandidate: {
      party_id: 'UNK'
    },

    initialize: function() {
      this.partyViewer = this.partyViewer || new PartyView();
    },

    parse: function(response) {
      var parsed = {};
      var winning;
      this.partyViewer = this.partyViewer || new PartyView();

      // Go through candidates
      parsed.candidates = _.map(response, function(c) {
        // Change party from DFL to D for federal positions
        if ((c.office_name.toLowerCase().indexOf('president') !== -1 ||
          c.office_name.toLowerCase().indexOf('u.s.') !== -1) &&
          c.party_id === 'DFL') {
          c.party_id = 'D';
        }

        // Create party color output
        c.partyOutput = this.partyViewer.render(c.party_id, c.party_id);
        return c;
      }, this);
      parsed.candidates = _.sortBy(parsed.candidates, function(c) { return c.percentage * -1; });

      if (!_.isUndefined(parsed.candidates[0])) {
        parsed.race_id = parsed.candidates[0].race_id;
        parsed.race = parsed.candidates[0].office_name;
        parsed.updated = parsed.candidates[0].updated;
        parsed.updated_moment = moment.unix(parsed.candidates[0].updated);
        parsed.precincts_reporting = parsed.candidates[0].precincts_reporting;
        parsed.total_effected_precincts = parsed.candidates[0].total_effected_precincts;
        parsed.precincts_percentage = parsed.precincts_reporting / parsed.total_effected_precincts;
        parsed.question_body = parsed.candidates[0].question_body;

        // Determine winning candidate(s).  Could be more than one.
        var electing = parsed.candidates[0].office_name.match(/\(elect ([0-9]*)\)/i);
        electing = (electing === null) ? 1 : parseInt(electing[1], 10);
        winning = (parsed.precincts_percentage === 0) ? [ this.blankCandidate ] :
          _.first(parsed.candidates, electing);
        parsed.winning_party = winning[0].party_id;
        parsed.winning_party_color = this.partyViewer.getColor(winning[0].party_id);

        // Determine if candidates won (100% reporting and winning)
        parsed.all_in = (parsed.precincts_percentage == 1) ? true : false;
        parsed.candidates = _.map(parsed.candidates, function(c) {
          var found = _.find(winning, function(w) { return (w.candidate_id === c.candidate_id); });
          c.won = (found) ? true : false;
          return c;
        });

        // If estimated blanks, need to count as no (last minute hack)
        var estimate = _.find(parsed.candidates, function(w) { return (w.candidate === 'ESTIMATED BLANKS'); });
        if (estimate) {
          var yes = _.find(parsed.candidates, function(w) { return (w.candidate === 'YES'); });
          var no = _.find(parsed.candidates, function(w) { return (w.candidate === 'NO'); });
          yes = yes.percentage;
          no = no.percentage + estimate.percentage;
          parsed.candidates = _.map(parsed.candidates, function(c) {
            c.won = false;
            if ((c.candidate === 'YES' && (yes > no)) || (c.candidate === 'NO' && (no > yes))) {
              c.won = true;
            }
            return c;
          });
        }

        // More hacks for some called races
        if (!_.isUndefined(calledRaces[parsed.race_id]) && _.isString(calledRaces[parsed.race_id])) {
          parsed.all_in = true;
          parsed.candidates = _.map(parsed.candidates, function(c) {
            c.won = (c.candidate === calledRaces[parsed.race_id]) ? true : false;
            return c;
          });
        }
      }
      return parsed;
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);