/**
 * Models
 */
(function(App, $, undefined) {
  App.ContestsCollection = Backbone.Collection.extend({

    model: App.ContestModel,

    parse: function(response) {
      return _.values(_.groupBy(response, 'race_id'));
    },

    initialize: function(models, options) {
      this.options = options || {};
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);