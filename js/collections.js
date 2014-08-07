/**
 * Collections
 */
define([
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
