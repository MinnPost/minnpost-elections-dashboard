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