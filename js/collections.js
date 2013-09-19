/**
 * Models
 */
(function(app, $, undefined) {
  app.prototype.RacesCollection = Backbone.Collection.extend({
    safeFields: [ 'question_body', 'office_name', 'candidate', 'race_id', 'special' ],

    specialQueries: {
      'state-leg': ["SELECT * FROM results_general WHERE office_name LIKE '%state senator%' ",
        "OR office_name LIKE '%state representative%' ORDER BY office_name"],
      'us-congress': ["SELECT * FROM results_general WHERE office_name LIKE '%u.s. senator%' ",
        "OR office_name LIKE '%u.s. representative%' ORDER BY office_name"],
      'judicial': ["SELECT * FROM results_general WHERE office_name LIKE '%judge%' ",
        "OR office_name LIKE '%justice%' ORDER BY office_name"],
      'questions': ["SELECT * FROM results_general WHERE office_name LIKE '%question%' ",
        "OR office_name LIKE '%amendment%' ORDER BY office_name"],
      'metro-council': ["SELECT r.* FROM results_general AS r JOIN district_municipal AS d ",
        "ON r.district_code = d.mcd_fips_code AND d.county_id IN ('27', '62') ",
        "WHERE r.office_name LIKE '%council member%' ",
        "ORDER BY r.office_name"],
      'hennepin-park-commissioner': ["SELECT * FROM results_general ",
        "WHERE office_name LIKE '%County Park Commissioner%'"]
    },
    url: function() {
      var query = [];
      this.options.search = decodeURI(this.options.search.replace(/\+/g, ' '));
      this.options.limit = this.options.limit || 40;
      this.options.field = (_.contains(this.safeFields, this.options.field)) ?
        this.options.field : 'office_name';

      // Put together query.  For general searching, we actually
      // need to subquery to get race_ids and make sure we
      // are showing everything in a race.
      if (this.options.field === 'special' &&
        _.isArray(this.specialQueries[this.options.search])) {
        query = this.specialQueries[this.options.search];
        // Push limit up so we don't mark as too many
        this.options.limit = 1000;
      }
      else {
        // Use subqueries for other fields
        query.push("SELECT r.* FROM results_general AS r ");
        query.push("INNER JOIN (SELECT DISTINCT race_id FROM results_general WHERE ");
        query.push(this.options.field + " LIKE '%" + this.options.search + "%' ");
        query.push("LIMIT " + this.options.limit + ") AS sub ");
        query.push("ON r.race_id = sub.race_id ");
        query.push("ORDER BY r.office_name, r.percentage ");
      }
      return baseAPIURL + encodeURI(query.join(''));
    },

    model: app.RaceModel,

    parse: function(response) {
      return _.values(_.groupBy(response, 'race_id'));
    },

    initialize: function(models, options) {
      this.options = options || {};
    },

    exportData: function() {
      var data = {};
      var cCount = 0;
      data.races = this.toJSON();
      data.title = this.options.search;

      if (this.length > 0) {
        // Flag if too many races
        if (this.length >= this.options.limit) {
          data.tooMany = true;
        }

        // Get first race to get some aggregate values
        data.updated = this.at(0).get('updated');
        data.updated_moment = this.at(0).get('updated_moment');
        data.precincts_percentage = this.at(0).get('precincts_percentage');
        data.precincts_reporting = this.at(0).get('precincts_reporting');
        data.total_effected_precincts = this.at(0).get('total_effected_precincts');
      }

      return data;
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);