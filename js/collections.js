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
        return "title LIKE '%" + s + "%' OR sub_title LIKE '%" + s + "%'";
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

    // Gets boundary data from boundary service.
    fetchBoundary: function() {
      var thisCollection = this;

      thisCollection.each(function(m){
        m.set('boundarySets', []);
        boundaries = [m.get('boundary')];
        if (boundaries[0].includes(",")) {
          boundaries = boundaries[0].split(",");
        }
        m.set('totalBoundaryCount', boundaries.length);
        
        _.each(boundaries, function(b){
          helpers.jsonpRequest({
            url: thisCollection.app.options.boundaryAPI + 'boundaries/' + encodeURIComponent(b) + '/simple_shape'
          }, thisCollection.app.options)
          .done(function(response) {
            if (response) {
              boundarySets = m.get('boundarySets');
              boundarySets.push({'slug': b, 'simple_shape': response});
              m.set('boundarySets', boundarySets);
              if (boundarySets.length == m.get('totalBoundaryCount')) {
                m.set('fetchedBoundary', true);
              }
            }
          });
        });

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
        var parts = b.url.split("/");
        var slug = parts[2] + "/" + parts[3];
        _.each(thisCollection.where({ boundary: slug }), function(m) {
          helpers.jsonpRequest({
            url: thisCollection.app.options.boundaryAPI + "boundaries/" + slug + '/simple_shape'
          }, thisCollection.app.options)
          .done(function(response){
            m.set('boundarySets', [{'slug': slug, 'simple_shape': response}]);
            m.set('fetchedBoundary', true);
          });
        });
      });

      this.matchedBoundary = true;
    },

    // Get Bundaries from coordinates
    fetchBoundaryFromCoordinates: function() {
      var thisCollection = this;

      //This lookup is for all the jurisdictions with contests this year that
      //consist of multiple boundaries
      multiMCDs = {"minor-civil-divisions-2010/2704904798": "minor-civil-divisions-2010/2704904798,minor-civil-divisions-2010/2715704798", "minor-civil-divisions-2010/2715704798": "minor-civil-divisions-2010/2704904798,minor-civil-divisions-2010/2715704798", "minor-civil-divisions-2010/2700306382": "minor-civil-divisions-2010/2700306382,minor-civil-divisions-2010/2712306382", "minor-civil-divisions-2010/2712306382": "minor-civil-divisions-2010/2700306382,minor-civil-divisions-2010/2712306382", "minor-civil-divisions-2010/2705907282": "minor-civil-divisions-2010/2705907282,minor-civil-divisions-2010/2706507282", "minor-civil-divisions-2010/2706507282": "minor-civil-divisions-2010/2705907282,minor-civil-divisions-2010/2706507282", "minor-civil-divisions-2010/2712108092": "minor-civil-divisions-2010/2712108092,minor-civil-divisions-2010/2714508092", "minor-civil-divisions-2010/2714508092": "minor-civil-divisions-2010/2712108092,minor-civil-divisions-2010/2714508092", "minor-civil-divisions-2010/2710909154": "minor-civil-divisions-2010/2710909154,minor-civil-divisions-2010/2710909154", "minor-civil-divisions-2010/2701910918": "minor-civil-divisions-2010/2701910918,minor-civil-divisions-2010/2705310918", "minor-civil-divisions-2010/2705310918": "minor-civil-divisions-2010/2701910918,minor-civil-divisions-2010/2705310918",  "minor-civil-divisions-2010/2704511008": "minor-civil-divisions-2010/2704511008,minor-civil-divisions-2010/2710911008", "minor-civil-divisions-2010/2710911008": "minor-civil-divisions-2010/2704511008,minor-civil-divisions-2010/2710911008", "minor-civil-divisions-2010/2714511800": "minor-civil-divisions-2010/2714511800,minor-civil-divisions-2010/2717111800", "minor-civil-divisions-2010/2717111800": "minor-civil-divisions-2010/2714511800,minor-civil-divisions-2010/2717111800", "minor-civil-divisions-2010/2701512772": "minor-civil-divisions-2010/2701512772,minor-civil-divisions-2010/2703312772", "minor-civil-divisions-2010/2703312772": "minor-civil-divisions-2010/2701512772,minor-civil-divisions-2010/2703312772", "minor-civil-divisions-2010/2705315022": "minor-civil-divisions-2010/2705315022,minor-civil-divisions-2010/2717115022", "minor-civil-divisions-2010/2717115022": "minor-civil-divisions-2010/2705315022,minor-civil-divisions-2010/2717115022", "minor-civil-divisions-2010/2704915706": "minor-civil-divisions-2010/2704915706,minor-civil-divisions-2010/2713115706", "minor-civil-divisions-2010/2713115706": "minor-civil-divisions-2010/2704915706,minor-civil-divisions-2010/2713115706", "minor-civil-divisions-2010/2709318134": "minor-civil-divisions-2010/2709318134,minor-civil-divisions-2010/2714518134", "minor-civil-divisions-2010/2714518134": "minor-civil-divisions-2010/2709318134,minor-civil-divisions-2010/2714518134", "minor-civil-divisions-2010/2707919160": "minor-civil-divisions-2010/2707919160,minor-civil-divisions-2010/2716119160", "minor-civil-divisions-2010/2716119160": "minor-civil-divisions-2010/2707919160,minor-civil-divisions-2010/2716119160", "minor-civil-divisions-2010/2702325280": "minor-civil-divisions-2010/2702325280,minor-civil-divisions-2010/2717325280", "minor-civil-divisions-2010/2717325280": "minor-civil-divisions-2010/2702325280,minor-civil-divisions-2010/2717325280", "minor-civil-divisions-2010/2705326990": "minor-civil-divisions-2010/2705326990,minor-civil-divisions-2010/2717126990", "minor-civil-divisions-2010/2717126990": "minor-civil-divisions-2010/2705326990,minor-civil-divisions-2010/2717126990", "minor-civil-divisions-2010/2711731760": "minor-civil-divisions-2010/2711731760,minor-civil-divisions-2010/2713331760", "minor-civil-divisions-2010/2713331760": "minor-civil-divisions-2010/2711731760,minor-civil-divisions-2010/2713331760", "minor-civil-divisions-2010/2705533866": "minor-civil-divisions-2010/2705533866,minor-civil-divisions-2010/2716933866", "minor-civil-divisions-2010/2716933866": "minor-civil-divisions-2010/2705533866,minor-civil-divisions-2010/2716933866", "minor-civil-divisions-2010/2704934172": "minor-civil-divisions-2010/2704934172,minor-civil-divisions-2010/2715734172", "minor-civil-divisions-2010/2715734172": "minor-civil-divisions-2010/2704934172,minor-civil-divisions-2010/2715734172", "minor-civil-divisions-2010/2707936746": "minor-civil-divisions-2010/2707936746,minor-civil-divisions-2010/2714336746", "minor-civil-divisions-2010/2714336746": "minor-civil-divisions-2010/2707936746,minor-civil-divisions-2010/2714336746", "minor-civil-divisions-2010/2715743036": "minor-civil-divisions-2010/2715743036,minor-civil-divisions-2010/2716943036", "minor-civil-divisions-2010/2716943036": "minor-civil-divisions-2010/2715743036,minor-civil-divisions-2010/2716943036", "minor-civil-divisions-2010/2701343198": "minor-civil-divisions-2010/2701343198,minor-civil-divisions-2010/2704343198", "minor-civil-divisions-2010/2704343198": "minor-civil-divisions-2010/2701343198,minor-civil-divisions-2010/2704343198", "minor-civil-divisions-2010/2702144422": "minor-civil-divisions-2010/2702144422,minor-civil-divisions-2010/2709744422", "minor-civil-divisions-2010/2709744422": "minor-civil-divisions-2010/2702144422,minor-civil-divisions-2010/2709744422", "minor-civil-divisions-2010/2707945808": "minor-civil-divisions-2010/2707945808,minor-civil-divisions-2010/2713945808", "minor-civil-divisions-2010/2713945808": "minor-civil-divisions-2010/2707945808,minor-civil-divisions-2010/2713945808", "minor-civil-divisions-2010/2703746924": "minor-civil-divisions-2010/2703746924,minor-civil-divisions-2010/2713146924", "minor-civil-divisions-2010/2713146924": "minor-civil-divisions-2010/2703746924,minor-civil-divisions-2010/2713146924", "minor-civil-divisions-2010/2701347068": "minor-civil-divisions-2010/2701347068,minor-civil-divisions-2010/2710347068", "minor-civil-divisions-2010/2710347068": "minor-civil-divisions-2010/2701347068,minor-civil-divisions-2010/2710347068", "minor-civil-divisions-2010/2709148562": "minor-civil-divisions-2010/2709148562,minor-civil-divisions-2010/2716548562", "minor-civil-divisions-2010/2716548562": "minor-civil-divisions-2010/2709148562,minor-civil-divisions-2010/2716548562", "minor-civil-divisions-2010/2704148796": "minor-civil-divisions-2010/2704148796,minor-civil-divisions-2010/2715348796", "minor-civil-divisions-2010/2715348796": "minor-civil-divisions-2010/2704148796,minor-civil-divisions-2010/2715348796", "minor-civil-divisions-2010/2704951136": "minor-civil-divisions-2010/2704951136,minor-civil-divisions-2010/2710951136", "minor-civil-divisions-2010/2710951136": "minor-civil-divisions-2010/2704951136,minor-civil-divisions-2010/2710951136", "minor-civil-divisions-2010/2709552522": "minor-civil-divisions-2010/2709552522,minor-civil-divisions-2010/2714152522", "minor-civil-divisions-2010/2714152522": "minor-civil-divisions-2010/2709552522,minor-civil-divisions-2010/2714152522", "minor-civil-divisions-2010/2712753656": "minor-civil-divisions-2010/2712753656,minor-civil-divisions-2010/2712953656", "minor-civil-divisions-2010/2712953656": "minor-civil-divisions-2010/2712753656,minor-civil-divisions-2010/2712953656", "minor-civil-divisions-2010/2705355006": "minor-civil-divisions-2010/2705355006,minor-civil-divisions-2010/2717155006", "minor-civil-divisions-2010/2717155006": "minor-civil-divisions-2010/2705355006,minor-civil-divisions-2010/2717155006", "minor-civil-divisions-2010/2707755438": "minor-civil-divisions-2010/2707755438,minor-civil-divisions-2010/2713555438", "minor-civil-divisions-2010/2713555438": "minor-civil-divisions-2010/2707755438,minor-civil-divisions-2010/2713555438", "minor-civil-divisions-2010/2711156014": "minor-civil-divisions-2010/2711156014,minor-civil-divisions-2010/2716756014", "minor-civil-divisions-2010/2716756014": "minor-civil-divisions-2010/2711156014,minor-civil-divisions-2010/2716756014", "minor-civil-divisions-2010/2700956176": "minor-civil-divisions-2010/2700956176,minor-civil-divisions-2010/2709756176", "minor-civil-divisions-2010/2709756176": "minor-civil-divisions-2010/2700956176,minor-civil-divisions-2010/2709756176", "minor-civil-divisions-2010/2700356950": "minor-civil-divisions-2010/2700356950,minor-civil-divisions-2010/2705956950", "minor-civil-divisions-2010/2705956950": "minor-civil-divisions-2010/2700356950,minor-civil-divisions-2010/2705956950", "minor-civil-divisions-2010/2700958612": "minor-civil-divisions-2010/2700958612,minor-civil-divisions-2010/2714558612", "minor-civil-divisions-2010/2714558612": "minor-civil-divisions-2010/2700958612,minor-civil-divisions-2010/2714558612", "minor-civil-divisions-2010/2701960016": "minor-civil-divisions-2010/2701960016,minor-civil-divisions-2010/2705360016", "minor-civil-divisions-2010/2705360016": "minor-civil-divisions-2010/2701960016,minor-civil-divisions-2010/2705360016", "minor-civil-divisions-2010/2700361996": "minor-civil-divisions-2010/2700361996,minor-civil-divisions-2010/2712361996", "minor-civil-divisions-2010/2712361996": "minor-civil-divisions-2010/2700361996,minor-civil-divisions-2010/2712361996", "minor-civil-divisions-2010/2715362446": "minor-civil-divisions-2010/2715362446,minor-civil-divisions-2010/2715962446", "minor-civil-divisions-2010/2715962446": "minor-civil-divisions-2010/2715362446,minor-civil-divisions-2010/2715962446", "minor-civil-divisions-2010/2709763778": "minor-civil-divisions-2010/2709763778,minor-civil-divisions-2010/2715363778", "minor-civil-divisions-2010/2715363778": "minor-civil-divisions-2010/2709763778,minor-civil-divisions-2010/2715363778", "minor-civil-divisions-2010/2711167504": "minor-civil-divisions-2010/2711167504,minor-civil-divisions-2010/2715967504", "minor-civil-divisions-2010/2715967504": "minor-civil-divisions-2010/2711167504,minor-civil-divisions-2010/2715967504", "minor-civil-divisions-2010/2701339878": "minor-civil-divisions-2010/2701339878,minor-civil-divisions-2010/2707939878,minor-civil-divisions-2010/2710339878", "minor-civil-divisions-2010/2707939878": "minor-civil-divisions-2010/2701339878,minor-civil-divisions-2010/2707939878, minor-civil-divisions-2010/2710339878", "minor-civil-divisions-2010/2710339878": "minor-civil-divisions-2010/2701339878,minor-civil-divisions-2010/2707939878,minor-civil-divisions-2010/2710339878", "minor-civil-divisions-2010/2700956896": "minor-civil-divisions-2010/2700956896,minor-civil-divisions-2010/2714156896,minor-civil-divisions-2010/2714556896", "minor-civil-divisions-2010/2714156896": "minor-civil-divisions-2010/2700956896,minor-civil-divisions-2010/2714156896, minor-civil-divisions-2010/2714556896", "minor-civil-divisions-2010/2714556896": "minor-civil-divisions-2010/2700956896,minor-civil-divisions-2010/2714156896,minor-civil-divisions-2010/2714556896"};

      helpers.jsonpRequest({
        url: this.app.options.boundaryAPI + 'boundaries/?contains=' +
          encodeURIComponent(this.options.lonlat[1]) + ',' +
          encodeURIComponent(this.options.lonlat[0]) + '&sets=' +
          encodeURIComponent(this.app.options.boundarySets.join(','))
      }, this.app.options)
      .done(function(response) {
        if (_.isArray(response.objects)) {
          thisCollection.fullBoundaries = response.objects;
          var slugs = [];
          _.each(response.objects, function(r) {
            var parts = r.url.split("/");
            var slug = parts[2] + "/" + parts[3];
            slug = (multiMCDs[slug]) ? multiMCDs[slug] : slug; //Replace slug if part of multi-part MCD
            slugs.push(slug);
          });
          thisCollection.boundaries = slugs;
          thisCollection.trigger('fetchedBoundary');
        }
      });
    }
  });

  return collections;

});
