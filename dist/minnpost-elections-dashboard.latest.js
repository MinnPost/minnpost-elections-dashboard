/**
 * Some core functionality for minnpost applications
 */

/**
 * Global variable to hold the "application" and templates.
 */
var mpApps = mpApps || {};
var mpTemplates = mpTemplates || {};
mpTemplates['minnpost-elections-dashboard'] = mpTemplates['minnpost-elections-dashboard'] || {};

/**
 * Extend underscore
 */
_.mixin({
  /**
   * Formats number
   */
  formatNumber: function(num, decimals) {
    decimals = (_.isUndefined(decimals)) ? 2 : decimals;
    var rgx = (/(\d+)(\d{3})/);
    split = num.toFixed(decimals).toString().split('.');

    while (rgx.test(split[0])) {
      split[0] = split[0].replace(rgx, '$1' + ',' + '$2');
    }
    return (decimals) ? split[0] + '.' + split[1] : split[0];
  },

  /**
   * Formats number into currency
   */
  formatCurrency: function(num) {
    return '$' + _.formatNumber(num, 2);
  },

  /**
   * Formats percentage
   */
  formatPercent: function(num) {
    return _.formatNumber(num * 100, 1) + '%';
  },

  /**
   * Formats percent change
   */
  formatPercentChange: function(num) {
    return ((num > 0) ? '+' : '') + _.formatPercent(num);
  },

  /**
   * Converts string into a hash (very basically).
   */
  hash: function(str) {
    return Math.abs(_.reduce(str.split(''), function(a, b) {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0));
  },

  /**
   * Returns version of MSIE.
   */
  isMSIE: function() {
    var match = /(msie) ([\w.]+)/i.exec(navigator.userAgent);
    return match ? parseInt(match[2], 10) : false;
  }
});

/**
 * Override Backbone's ajax call to use JSONP by default as well
 * as force a specific callback to ensure that server side
 * caching is effective.
 */
Backbone.ajax = function() {
  var options = arguments;

  if (options[0].dataTypeForce !== true) {
    options[0].dataType = 'jsonp';
    options[0].jsonpCallback = 'mpServerSideCachingHelper' +
      _.hash(options[0].url);
  }
  return Backbone.$.ajax.apply(Backbone.$, options);
};

/**
 * Create "class" for the main application.  This way it could be
 * used more than once.
 */
(function($, undefined) {
  // Create "class"
  App = mpApps['minnpost-elections-dashboard'] = function(options) {
    this.options = _.extend(this.defaultOptions, options);
    this.$el = $(this.options.el);
    this.templates = mpTemplates['minnpost-elections-dashboard'] || {};
    this.data = this.data || {};
  };

  _.extend(App.prototype, {
    // Use backbone's extend function
    extend: Backbone.Model.extend,

    /**
     * JSONP request
     */
    jsonpRequest: function() {
      var options = arguments[0];

      options.dataType = 'jsonp';
      options.jsonpCallback = 'mpServerSideCachingHelper' +
        _.hash(options.url);
      return $.ajax.apply($, [options]);
    },

    /**
     * Template handling.  For development, we want to use
     * the template files directly, but for build, they should be
     * compiled into JS.
     *
     * See JST grunt plugin to understand how templates
     * are compiled.
     *
     * Expects callback like: function(compiledTemplate) {  }
     */
    getTemplates: function(names) {
      var thisApp = this;
      var defers = [];
      names = _.isArray(names) ? names : [names];

      // Go through each file and add to defers
      _.each(names, function(n) {
        var defer;
        var path = 'js/templates/' + n + '.mustache';

        if (_.isUndefined(thisApp.templates[n])) {
          defer = $.ajax({
            url: path,
            method: 'GET',
            async: false,
            contentType: 'text'
          });

          $.when(defer).done(function(data) {
            thisApp.templates[n] = data;
          });
          defers.push(defer);
        }
      });

      return $.when.apply($, defers);
    },
    // Wrapper around getting a template
    template: function(name) {
      return this.templates[name];
    },

    /**
     * Data source handling.  For development, we can call
     * the data directly from the JSON file, but for production
     * we want to proxy for JSONP.
     *
     * `name` should be relative path to dataset minus the .json
     *
     * Returns jQuery's defferred object.
     */
    getLocalData: function(name) {
      var thisApp = this;
      var proxyPrefix = this.options.jsonpProxy;
      var useJSONP = false;
      var defers = [];

      name = (_.isArray(name)) ? name : [ name ];

      // If the data path is not relative, then use JSONP
      if (this.options && this.options.dataPath.indexOf('http') === 0) {
        useJSONP = true;
      }

      // Go through each file and add to defers
      _.each(name, function(d) {
        var defer;
        if (_.isUndefined(thisApp.data[d])) {

          if (useJSONP) {
            defer = this.jsonpRequest({
              url: proxyPrefix + encodeURI(thisApp.options.dataPath + d + '.json')
            });
          }
          else {
            defer = $.getJSON(thisApp.options.dataPath + d + '.json');
          }

          $.when(defer).done(function(data) {
            thisApp.data[d] = data;
          });
          defers.push(defer);
        }
      });

      return $.when.apply($, defers);
    },

    /**
     * Get remote data.  Provides a wrapper around
     * getting a remote data source, to use a proxy
     * if needed, such as using a cache.
     */
    getRemoteData: function(options) {
      options.dataType = 'jsonp';

      if (this.options.remoteProxy) {
        options.url = options.url + '&callback=proxied_jqjsp';
        options.url = app.options.remoteProxy + encodeURIComponent(options.url);
        options.callback = 'proxied_jqjsp';
        options.cache = true;
      }

      return $.ajax(options);
    },

    // Placeholder start
    start: function() {
    }
  });
})(jQuery);



mpTemplates = mpTemplates || {}; mpTemplates['minnpost-elections-dashboard'] = {"template-application":"<div class=\"message-container\"></div>\n\n<div class=\"content-container\"></div>\n\n<div class=\"footnote-container\"></div>","template-contest":"<div class=\"contest {{ classes }} {{#(ranked_choice == 1)}}is-ranked-choice {{/()}}{{#(final === true)}}is-final{{/()}}\">\n  <a class=\"dashboard-link\" href=\"#dashboard\">&larr; Back to dashboard</a>\n\n  <div>\n    {{#((results.length == 0 || results == undefined) && !synced)}}\n      {{>loading}}\n    {{/()}}\n  </div>\n\n  {{#((results.length == 0 || results == undefined) && synced)}}\n    <h3>Did not find any contests</h3>\n  {{/()}}\n\n\n  {{#((results.length > 0) && synced)}}\n    <h3>{{ title }}</h3>\n\n    <div class=\"last-updated\">Last updated at {{ updated.format('h:mm a') }}</div>\n\n    {{#(!!question_body)}}\n      <p>{{{ question_body }}}</p>\n    {{/()}}\n  {{/()}}\n\n  <div class=\"grid-container grid-parent cf\">\n    <div class=\"grid-70 tablet-grid-70 mobile-grid-100 grid-parent inner-column-left\">\n      <table>\n        <thead>\n          <tr class=\"table-first-heading\">\n            <th class=\"winner-column\"></th>\n            <th>Candidate</th>\n            {{#partisan}}\n              <th>Party</th>\n            {{/partisan}}\n            {{#(ranked_choice == 1)}}\n              <th class=\"first-choice-column\">Results</th>\n              <th class=\"second-choice-column\"></th>\n              <th class=\"third-choice-column\"></th>\n              <th class=\"final-column\">Final</th>\n            {{/()}}\n            {{#(ranked_choice != 1)}}\n              <th>Percentage</th>\n              <th>Votes</th>\n            {{/()}}\n          </tr>\n          <tr class=\"table-second-heading\">\n            <th class=\"winner-column\"></th>\n            <th>{{ precincts_reporting }} of {{ total_effected_precincts }} precincts reporting.  {{#(seats > 1)}}Choosing {{ seats }}.{{/()}}</th>\n            {{#partisan}}\n              <th></th>\n            {{/partisan}}\n            {{#(ranked_choice == 1)}}\n              <th class=\"first-choice-column first-choice-heading\">1st choice</th>\n              <th class=\"second-choice-column second-choice-heading\">2nd choice</th>\n              <th class=\"third-choice-column third-choice-heading\">3rd choice</th>\n              <th class=\"final-column\"></th>\n            {{/()}}\n            {{#(ranked_choice != 1)}}\n              <th></th>\n              <th></th>\n            {{/()}}\n          </tr>\n        </thead>\n\n        <tbody>\n          {{#results:r}}\n            <tr data-row-id=\"{{ id }}\" class=\"{{ (r % 2 === 0) ? 'even' : 'odd' }}\">\n              <td class=\"winner-column\">{{#winner}}<span class=\"bs-icon bs-icon-won\"></span>{{/winner}}{{#(winner === false)}}<span class=\"bs-icon-spacer\"></span>{{/()}}</td>\n\n              <td class=\"candidate-column\">{{ candidate }}</td>\n\n              {{#partisan}}\n                <td>{{ party_id }}</td>\n              {{/partisan}}\n\n              {{#(ranked_choice == 1)}}\n                <td class=\"first-choice-column first-choice-heading\">{{ fNum(ranked_choices.1.percentage) }}% ({{ fNum(ranked_choices.1.votes_candidate, 0) }}&nbsp;votes)</td>\n                <td class=\"second-choice-column first-choice-heading\">{{ fNum(ranked_choices.2.percentage) }}% ({{ fNum(ranked_choices.2.votes_candidate, 0) }}&nbsp;votes)</td>\n                <td class=\"third-choice-column first-choice-heading\">{{ fNum(ranked_choices.3.percentage) }}% ({{ fNum(ranked_choices.3.votes_candidate, 0) }}&nbsp;votes)</td>\n                <td class=\"final-column first-choice-heading\">{{#ranked_choices.100.percentage}}{{ fNum(ranked_choices.100.percentage) }}% ({{ fNum(ranked_choices.100.votes_candidate, 0) }}&nbsp;votes){{/ranked_choices.100.percentage}}{{^ranked_choices.100.percentage}}&mdash;{{/ranked_choices.100.percentage}}</td>\n              {{/()}}\n\n              {{#(ranked_choice != 1)}}\n                <td>{{ fNum(percentage) }}%</td>\n                <td>{{ fNum(votes_candidate, 0) }}</td>\n              {{/()}}\n            </tr>\n          {{/results}}\n        </tbody>\n      </table>\n\n      <a href=\"#contest/{{ id }}\" class=\"contest-link\">Permalink</a>\n    </div>\n\n    <div class=\"grid-30 tablet-grid-30 mobile-grid-100 grid-parent inner-column-right\">\n      <div class=\"contest-map\" id=\"contest-map-{{ id }}\">\n      </div>\n    </div>\n  </div>\n</div>","template-contests":"<div class=\"contests\">\n  <a class=\"dashboard-link\" href=\"#dashboard\">&larr; Back to dashboard</a>\n\n  <div class=\"grid-container grid-parent cf\">\n    <div class=\"grid-70 tablet-grid-70 mobile-grid-100 grid-parent inner-column-left\">\n      <h3 class=\"contests-title {{#(lonlat != undefined)}}with-location{{/()}}\">{{ (title) ? title : 'Contests' }}</h3>\n\n      {{#(lonlat != undefined)}}\n        <p class=\"location-note\">The map below shows the approximate location of your search. If the location is not correct, try <a href=\"#dashboard\">searching for a more specific address</a>.</p>\n\n        <div id=\"location-map\"></div>\n      {{/())}}\n    </div>\n\n    <div class=\"grid-30 tablet-grid-30 mobile-grid-100 grid-parent inner-column-right\">\n    </div>\n  </div>\n\n  <div>\n    {{#(models.length == 0 && !synced)}}\n      {{>loading}}\n    {{/())}}\n\n    {{#(models.length == 0 && synced)}}\n      <p>Unable to find any contests.</p>\n    {{/())}}\n  </div>\n\n  <div class=\"contest-list\">\n    {{#models:i}}\n      {{>contest}}\n    {{/models}}\n  </div>\n</div>","template-dashboard-contest":"<div class=\"dashboard-contest {{ .classes }} {{#(.ranked_choice == 1)}}is-ranked-choice {{/()}}{{#(final === true)}}is-final{{/()}}\">\n  <div>\n    {{#(results.length == 0 || results == undefined)}}\n      {{>loading}}\n    {{/())}}\n  </div>\n\n  <h4>{{ .title }}</h4>\n\n  <table>\n    <thead>\n      <tr class=\"table-first-heading\">\n        <th class=\"winner-column\"></th>\n        <th>Candidate</th>\n        {{#(ranked_choice == 1)}}\n          <th>Round One</th>\n          <th>Final</th>\n        {{/()}}\n        {{#(ranked_choice != 1)}}\n          <th>Results</th>\n        {{/()}}\n      </tr>\n      <tr class=\"table-second-heading\">\n        <th class=\"winner-column\"></th>\n        <th>{{ precincts_reporting }} of {{ total_effected_precincts }} precincts reporting</th>\n        {{#(ranked_choice == 1)}}\n          <th class=\"first-choice-heading\">1st choice</th>\n        {{/()}}\n        <th></th>\n      </tr>\n    </thead>\n\n    <tbody>\n      {{#results:r}}{{#(r < 2 || (rows != undefined && r < rows))}}\n        <tr class=\"{{ (r % 2 === 0) ? 'even' : 'odd' }}\">\n          <td class=\"winner-column\">{{#winner}}<span class=\"bs-icon bs-icon-won\"></span>{{/winner}}{{#(winner === false)}}<span class=\"bs-icon-spacer\"></span>{{/()}}</td>\n\n          <td class=\"candidate-column\">{{ candidate }}</td>\n\n          {{#(ranked_choice == 1)}}\n            <td>{{ fNum(ranked_choices.1.percentage) }}% ({{ fNum(ranked_choices.1.votes_candidate, 0) }}&nbsp;votes)</td>\n            <td>{{#ranked_choices.100.percentage}}{{ fNum(ranked_choices.100.percentage) }}% ({{ fNum(ranked_choices.100.votes_candidate, 0) }}&nbsp;votes){{/ranked_choices.100.percentage}}{{^ranked_choices.100.percentage}}&mdash;{{/ranked_choices.100.percentage}}</td>\n          {{/()}}\n\n          {{#(ranked_choice != 1)}}\n            <td>{{ fNum(percentage) }}% ({{ fNum(votes_candidate, 0) }} votes)</td>\n          {{/()}}\n        </tr>\n      {{/()}}{{/results}}\n    </tbody>\n  </table>\n\n  <a href=\"#contest/{{ id }}\" class=\"contest-link\">Full results</a>\n</div>","template-dashboard":"<div class=\"dashboard cf grid-container grid-parent {{ classes }}\">\n\n  <div class=\"grid-parent grid-100 location-search-section\">\n    <form on-submit=\"addresssSearch\">\n      <div class=\"location-search-group\">\n        <input type=\"text\" id=\"address-search\" placeholder=\"Search by address for results\" />\n\n        {{#geolocationEnabled}}\n          <div class=\"geolocation\">\n            <a href=\"#location\">Or view contests at your current location</a>\n          </div>\n        {{/geolocationEnabled}}\n      </div>\n\n      <input type=\"submit\" value=\"Go\" class=\"address-search-submit\" />\n    </form>\n  </div>\n\n  <div class=\"grid-parent grid-100 last-updated-section\">\n    {{#contestMinneapolisMayor.updated}}\n      <div intro=\"fade\">\n        Last updated at {{ contestMinneapolisMayor.updated.format('h:mm a') }}\n      </div>\n    {{/contestMinneapolisMayor.updated}}\n  </div>\n\n  <div class=\"grid-parent grid-50 tablet-grid-50 mobile-grid-100\">\n    <div class=\"inner-column-left\">\n      <div class=\"contest-minneapolis-mayor dashboard-section\">\n        {{#contestMinneapolisMayor}}\n          {{>dashboardContest}}\n        {{/contestMinneapolisMayor}}\n      </div>\n\n      <div class=\"contest-st-paul-mayor dashboard-section\">\n        {{#contestStPaulMayor}}\n          {{>dashboardContest}}\n        {{/contestStPaulMayor}}\n      </div>\n\n      <div class=\"contest-st-paul-council dashboard-section\">\n        {{#contestStPaulCouncil}}\n          {{>dashboardContest}}\n        {{/contestStPaulCouncil}}\n      </div>\n\n      <div class=\"elections-search dashboard-section\">\n        <h4>Other elections</h4>\n\n        <form on-submit=\"contestSearch\">\n          <label for=\"contest-search\">{{#capabilities.typeahead}}Search contests by title or candidate.  Start typing to see suggestions for specific contests, or search by {{/capabilities.typeahead}}{{^capabilities.typeahead}}Search contests by title with {{/capabilities.typeahead}} keywords (e.g., \"<a href=\"#search/duluth\">Duluth</a>\" or \"<a href=\"#search/school+board\">school board</a>\").</label>\n\n          <input type=\"text\" id=\"contest-search\" placeholder=\"Search by title{{#capabilities.typeahead}} or candidate{{/capabilities.typeahead}}\" />\n          <input type=\"submit\" value=\"Go\" class=\"contest-search-submit\" />\n        </form>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"grid-parent grid-50 tablet-grid-50 mobile-grid-100\">\n    <div class=\"inner-column-right\">\n      <div class=\"contest-minneapolis-council dashboard-section\">\n        <h4 class=\"title-minneapolis-council\">Minneapolis City Council</h4>\n\n        {{#contestMinneapolisCouncil3}}\n          {{>dashboardContest}}\n        {{/contestMinneapolisCouncil3}}\n\n        {{#contestMinneapolisCouncil6}}\n          {{>dashboardContest}}\n        {{/contestMinneapolisCouncil6}}\n\n        {{#contestMinneapolisCouncil10}}\n          {{>dashboardContest}}\n        {{/contestMinneapolisCouncil10}}\n\n        {{#contestMinneapolisCouncil5}}\n          {{>dashboardContest}}\n        {{/contestMinneapolisCouncil5}}\n\n        {{#contestMinneapolisCouncil9}}\n          {{>dashboardContest}}\n        {{/contestMinneapolisCouncil9}}\n\n        {{#contestMinneapolisCouncil12}}\n          {{>dashboardContest}}\n        {{/contestMinneapolisCouncil12}}\n\n        {{#contestMinneapolisCouncil13}}\n          {{>dashboardContest}}\n        {{/contestMinneapolisCouncil13}}\n\n      </div>\n    </div>\n  </div>\n</div>","template-footnote":"<div class=\"footnote\">\n  <p>Unofficial election data provided by the <a href=\"http://www.sos.state.mn.us/\" target=\"_blank\">MN Secretary of State</a> and supplemented manually with data from the <a href=\"http://vote.minneapolismn.gov/\" target=\"_blank\">City of Minneapolis</a> and the <a href=\"http://www.stpaul.gov/index.aspx?NID=188\" target=\"_blank\">City of St. Paul</a>.  Test data will be provided until 8PM on Election Night.  Some code, techniques, and data on <a href=\"https://github.com/zzolo/minnpost-elections-dashboard\" target=\"_blank\">Github</a>.</p>\n\n  <p>The geographical boundaries, though recieved from official sources and queried from our <a href=\"http://boundaries.minnpost.com\" target=\"_blank\">boundary service</a>, may not represent the exact, offical area for a contest, race, or election.  It is also possible that, for a given location, the contests may not be accurate due to data quality with multiple agencies.  Please refer to your local and state election officials to know exactly what contests happen for a given location.</p>\n\n  <p>Some map data © OpenStreetMap contributors; licensed under the <a href=\"http://www.openstreetmap.org/copyright\" target=\"_blank\">Open Data Commons Open Database License</a>.  Some map design © MapBox; licensed according to the <a href=\"http://mapbox.com/tos/\" target=\"_blank\">MapBox Terms of Service</a>.  Location geocoding provided by <a href=\"http://www.mapquest.com/\" target=\"_blank\">Mapquest</a> and is not guaranteed to be accurate.</p>\n</div>","template-loading":"<div class=\"loading-container\">\n  <div class=\"loading\"><span>Loading...</span></div>\n</div>"};

/**
 * Main app logic for: minnpost-elections-dashboard
 */
(function(App, $, undefined) {
  _.extend(App.prototype, {

    // Default options
    defaultOptions: {
      dataPath: './data/',
      jsonpProxy: 'http://mp-jsonproxy.herokuapp.com/proxy?url=',
      electionsAPI: 'https://premium.scraperwiki.com/ez47yoa/aaff8e67f921428/sql/?q=',
      electionsAPILocal: 'http://localhost:5000/?q=',
      electionsAPIEC2: 'http://54.204.17.59/?box=ubuntu&q=',
      electionsAPIScraperWiki: 'https://premium.scraperwiki.com/ez47yoa/aaff8e67f921428/sql/?q=',
      boundaryAPI: 'http://boundaries.minnpost.com/1.0/',
      boundarySets: [
        'counties-2010',
        'county-commissioner-districts-2012',
        'minneapolis-parks-and-recreation-districts-2014',
        'minor-civil-divisions-2010',
        'school-districts-2013',
        'wards-2012'
      ],
      // Please don't steal/abuse
      mapQuestKey: 'Fmjtd%7Cluub2d01ng%2C8g%3Do5-9ua20a',
      mapQuestQuery: 'http://www.mapquestapi.com/geocoding/v1/address?key=[[[KEY]]]&outFormat=json&countrycodes=us&maxResults=1&location=[[[ADDRESS]]]',
      originalTitle: document.title,
      capabilities: {
        typeahead: (_.isMSIE() !== 9),
        preventLinks: (!_.isMSIE() && _.isMSIE() <= 9)
      }
    },

    // Start function that starts the application.
    start: function() {
      var thisApp = this;
      var templates = ['template-application', 'template-footnote', 'template-dashboard', 'template-loading', 'template-contest', 'template-contests', 'template-dashboard-contest'];

      // Get templates and start rendering
      this.getTemplates(templates).done(function() {
        // Render the container and "static" templates.
        thisApp.applicationView = new thisApp.ApplicationView({
          el: thisApp.$el,
          template: thisApp.template('template-application')
        });
        thisApp.footnoteView = new thisApp.FootnoteView({
          el: thisApp.$el.find('.footnote-container'),
          template: thisApp.template('template-footnote')
        });

        // Create router which will handle most of the high
        // level logic
        thisApp.router = new thisApp.DashboardRouter(_.extend(thisApp.options, { app: thisApp }));
        thisApp.router.start();

        // Try to ensure that links are prevented from their default
        // behavior.  Sometimes because of Ractive's dom insertions, the
        // preventDefault is not handled correctly
        if (thisApp.options.capabilities.preventLinks) {
          $('a[href^="#"]').on('click', thisApp.$el, function(e) {
            e.preventDefault();
            thisApp.router.navigate($(this).attr('href'), { trigger: true });
          });
        }
      });
    }
  });
})(mpApps['minnpost-elections-dashboard'], jQuery);

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
      var rankedChoiceFinal = false;
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


      // Mark who won.  Overall having all precincts reporting is good
      // enough but with ranked choice, we need have all the final data
      // in
      if (parsed.ranked_choice) {
        rankedChoiceFinal = (_.size(parsed.results) == _.size(_.filter(parsed.results, function(r) {
          return (!_.isUndefined(r.ranked_choices[100]));
        })));
      }
      if ((parsed.precincts_reporting === parsed.total_effected_precincts &&
        !parsed.ranked_choice) ||
        (parsed.ranked_choice && rankedChoiceFinal === true &&
        parsed.precincts_reporting === parsed.total_effected_precincts
        )) {
        parsed.results = _.map(parsed.results, function(r, i) {
          r.winner = false;
          if (i < parsed.seats) {
            r.winner = true;
          }
          return r;
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

      this.app.jsonpRequest({
        url: this.app.options.boundaryAPI + 'boundary/?limit=10&slug__in=' +
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

/**
 * Models
 */
(function(App, $, undefined) {
  App.prototype.ContestsCollection = Backbone.Collection.extend({
    model: App.prototype.ContestModel,

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

    // Parse the results
    parse: function(response) {
      return _.values(_.groupBy(response, 'id'));
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

      this.app.jsonpRequest({
        url: this.app.options.boundaryAPI + 'boundary/?limit=30&slug__in=' +
          encodeURIComponent(this.pluck('boundary').join(','))
      })
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

  // A collection based a location
  App.prototype.ContestsLocationCollection = App.prototype.ContestsCollection.extend({

    // Base query for the contest
    query: "SELECT r.*, c.* FROM contests AS c LEFT JOIN results AS r " +
      "ON c.id = r.contest_id WHERE boundary IN (%CONTEST_SEARCH%) " +
      "ORDER BY  c.title, r.percentage, r.candidate ASC LIMIT 400",

    // Construct API call
    url: function() {
      return this.app.options.electionsAPI +
        encodeURIComponent(this.query.replace('%CONTEST_SEARCH%',
          "'" + this.boundaries.join("','") + "'"));
    },

    initialize: function(models, options) {
      // Call parent intializer
      App.prototype.ContestsLocationCollection.__super__.initialize.apply(this, arguments);

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

      this.app.jsonpRequest({
        url: this.app.options.boundaryAPI + 'boundary/?contains=' +
          encodeURIComponent(this.options.lonlat[1]) + ',' +
          encodeURIComponent(this.options.lonlat[0]) + '&sets=' +
          encodeURIComponent(this.app.options.boundarySets.join(','))
      })
      .done(function(response) {
        if (_.isArray(response.objects)) {
          thisCollection.fullBoundaries = response.objects;
          thisCollection.boundaries = _.pluck(response.objects, 'slug');
          thisCollection.trigger('fetchedBoundary');
        }
      });
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);

(function(App, $, undefined) {

  App.prototype.ApplicationView = Ractive.extend({
    init: function() {
    }
  });

  App.prototype.FootnoteView = Ractive.extend({
    init: function() {
    }
  });

  App.prototype.ContestBaseView = Ractive.extend({
    defaultMapStyle: {
      stroke: true,
      color: '#2DA51D',
      weight: 1.5,
      opacity: 0.9,
      fill: true,
      fillColor: '#2DA51D',
      fillOpacity: 0.2,
      clickable: false
    },

    // Put together map for boundary(s)
    makeMap: function(id, boundaries) {
      var thisView = this;
      var featureGroup;
      var shapes;
      var found = {};
      var map;
      boundaries = _.isArray(boundaries) ? boundaries : [boundaries];

      // Ensure that we only add the same boundary once
      boundaries = _.filter(boundaries, function(b) {
        if (_.isUndefined(found[b.slug])) {
          found[b.slug] = true;
          return true;
        }
        else {
          return false;
        }
      });

      // Just get the shapes
      shapes = _.map(boundaries, function(b, bi) {
        return b.simple_shape;
      });

      // Make map
      map = new L.Map(id, {
        zoom: 10,
        center: [44.9800, -93.2636],
        scrollWheelZoom: false,
        trackResize: true,
        zoomControl: false,
        dragging: false
      });
      map.addControl(new L.Control.Zoom({ position: 'topright' }));
      map.attributionControl.setPrefix(false);
      map.addLayer(new L.tileLayer('//{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png'));

      // Make GeoJSON layer from shapes
      featureGroup = new L.featureGroup();
      _.each(shapes, function(s) {
        var layer = new L.geoJson(s);
        layer.setStyle(thisView.defaultMapStyle);
        featureGroup.addLayer(layer);
      });
      map.addLayer(featureGroup);

      // Fit bounds breaks stuff because the geojson is not necessarily
      // fully loaded in the map, so we wrap this timer around it, as
      // Leaflet does not provide an sort of mechanism to allow us to know
      // when the layer is fully loaded
      window.setTimeout(function() {
        map.fitBounds(featureGroup.getBounds());
      }, 500);
    },

    // Form handling for some older browsers.  This does end up
    // firing the handler twice :(
    handleForms: function() {
      var thisView = this;
      $(this.el).find('form').on('submit', function(e) {
        var trigger = $(this).attr('legacy-on-submit');
        if (trigger) {
          e.preventDefault();
          thisView.fire(trigger, { original: e });
        }
        return false;
      });
    },

    // Handle title change for document title
    observeTitle: function(originalTitle) {
      this.observe('title', function(newValue, oldValue) {
        if (newValue) {
          document.title = (originalTitle) ? newValue + ' | ' + originalTitle :
            newValue;
        }
      });
    }
  });

  App.prototype.DashboardView = App.prototype.ContestBaseView.extend({
    init: function(options) {
      var thisView = this;
      var $contestSearch = $(this.el).find('#contest-search');
      var query;
      this.app = options.app;

      // Attach formatters
      this.set('fNum', _.formatNumber);

      // Typeahead.  This seems to break in IE. Query can be
      // either a contest or candidate
      if (this.app.options.capabilities.typeahead) {
        query = this.app.options.electionsAPI +
          "SELECT c.id AS id, title AS title " +
          "FROM contests AS c WHERE " +
          "c.title LIKE '%%QUERY%' " +
          "UNION " +
          "SELECT c.id AS id, " +
          "r.candidate || ' (' || c.title || ')' AS title " +
          "FROM results AS r " +
          "JOIN contests AS c ON r.contest_id = c.id " +
          "WHERE r.candidate LIKE '%%QUERY%' ORDER BY title LIMIT 20 ";

        // Make typeahead functionality for search
        $contestSearch.typeahead({
          name: 'Contests and Candidates',
          remote: {
            url: query,
            dataType: 'jsonp',
            jsonpCallback: 'mpServerSideCachingHelper',
            replace: function(url, uriEncodedQuery) {
              var query = decodeURIComponent(uriEncodedQuery);
              query = query.replace(new RegExp(' ', 'g'), '%');
              return encodeURI(url.replace(new RegExp(this.wildcard, 'g'), query));
            }
          },
          valueKey: 'title'
        });

        // Handle search selected
        $contestSearch.on('typeahead:selected', function(e, data, name) {
          thisView.app.router.navigate('/contest/' + data.id, { trigger: true });
        });

        // Teardown event to remove typeahead gracefully
        this.on('teardown', function() {
          $contestSearch.typeahead('destroy');
        });
      }

      // Mark if geolocation is availablle
      this.set('geolocationEnabled', (_.isObject(navigator) && _.isObject(navigator.geolocation)));
    }
  });

  App.prototype.ContestView = App.prototype.ContestBaseView.extend({
    init: function() {
      this.set('classes', 'contest-view');

      // Attach formatters
      this.set('fNum', _.formatNumber);

      // Make a map if boundary has been found
      this.observe('boundarySets', function(newValue, oldValue) {
        if (_.isArray(newValue) && _.isObject(newValue[0])) {
          this.makeMap('contest-map-' + this.get('id'), newValue);
        }
      });
    }
  });

  App.prototype.ContestsView = App.prototype.ContestBaseView.extend({
    init: function() {
      var thisView = this;
      var shapes = [];
      var rendered = {};

      // Attach formatters
      this.set('fNum', _.formatNumber);

      // React to boundary update.  Not sure how to use wildcards in
      // Ractive, so we hack around it.
      this.observe('models.0.fetchedBoundary', function(newValue, oldValue) {
        var testModel = this.get('models.0.boundarySets');

        if (_.isArray(testModel) && _.isObject(testModel[0])) {
          _.each(this.get('models'), function(m) {
            thisView.makeMap('contest-map-' + m.get('id'), m.get('boundarySets'));
          });
        }
      });

      // Update view when synced
      this.data.models.on('sync', function() {
        thisView.set('synced', true);
      });

      // Make location map if lonlat exist
      this.observe('lonlat', function(newValue, oldValue) {
        var ll = newValue;
        var map;
        var circle;

        if (_.isArray(ll) && _.isNumber(ll[0])) {
          map = new L.Map('location-map', {
            zoom: 13,
            center: [ll[1], ll[0]],
            scrollWheelZoom: false,
            trackResize: true,
            zoomControl: false,
            dragging: false
          });
          map.attributionControl.setPrefix(false);
          map.addLayer(new L.tileLayer('//{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png'));

          circle = new L.circleMarker([ll[1], ll[0]], 10);
          circle.setStyle(this.defaultMapStyle);
          map.addLayer(circle);
        }
      });
    }
  });

})(mpApps['minnpost-elections-dashboard'], jQuery);

/**
 * Routers
 */
(function(App, $, undefined) {
  App.prototype.DashboardRouter = Backbone.Router.extend({
    initialize: function(options) {
      this.options = options;
      this.app = options.app;
    },

    routes: {
      'dashboard': 'routeDashboard',
      'search/:term': 'routeSearch',
      'contest/:contest': 'routeContest',
      'location(/:place)': 'routeLocation',
      '*default': 'routeDefault'
    },

    start: function() {
      Backbone.history.start();
    },

    routeDefault: function() {
      this.navigate('/dashboard', { trigger: true, replace: true });
    },

    routeDashboard: function() {
      var thisRouter = this;
      var data = {};
      this.teardownObjects();

      // Get races objects
      this.app.dashboardContests = {
        contestMinneapolisMayor: 'id-MN---43000-2001',
        contestMinneapolisCouncil3: 'id-MN---43000-2121',
        contestMinneapolisCouncil6: 'id-MN---43000-2151',
        contestMinneapolisCouncil10: 'id-MN---43000-2191',
        contestMinneapolisCouncil5: 'id-MN---43000-2141',
        contestMinneapolisCouncil9: 'id-MN---43000-2181',
        contestMinneapolisCouncil12: 'id-MN---43000-2211',
        contestMinneapolisCouncil13: 'id-MN---43000-2221',
        contestStPaulMayor: 'id-MN---58000-2001',
        contestStPaulCouncil: 'id-MN---58000-2101'
      };
      _.each(this.app.dashboardContests, function(c, ci) {
        thisRouter.app[ci] = new thisRouter.app.ContestModel({ id: c }, { app: thisRouter.app });
        thisRouter.app[ci].connect(false);
        data[ci] = thisRouter.app[ci];
      });

      // Partials don't take arguments, so we have to set some things here
      data.contestMinneapolisMayor.set('rows', 8);
      data.contestStPaulMayor.set('rows', 3);

      // We need some of this data
      data.capabilities = thisRouter.app.options.capabilities;

      // Create dashboard view
      data.title = 'Dashboard';
      this.app.dashboardView = new this.app.DashboardView({
        el: this.app.$el.find('.content-container'),
        template: this.app.template('template-dashboard'),
        data: data,
        app: this.app,
        partials: {
          dashboardContest: this.app.template('template-dashboard-contest'),
          loading: this.app.template('template-loading')
        },
        adaptors: [ 'Backbone' ]
      });

      // Handle searches here as we have an easy reference
      // to the router.
      this.app.dashboardView.on('addresssSearch', function(e) {
        var val = $(this.el).find('#address-search').val();
        e.original.preventDefault();
        if (val) {
          thisRouter.navigate('/location/' + encodeURIComponent(val),
          { trigger: true });
        }
      });
      this.app.dashboardView.on('contestSearch', function(e) {
        e.original.preventDefault();
        var $input = $(this.el).find('#contest-search');
        var val = $input.val();
        if (val) {
          thisRouter.navigate('/search/' + encodeURIComponent(val),
          { trigger: true });
        }
      });
      this.app.dashboardView.observeTitle(this.app.options.originalTitle);
      this.reFocus();
    },

    routeSearch: function(term) {
      this.teardownObjects();

      this.app.contestsSearch = new this.app.ContestsCollection([], {
        app: this.app,
        search: term
      });
      this.app.contestsSearch.connect();
      this.app.contestsSearchView = new this.app.ContestsView({
        el: this.app.$el.find('.content-container'),
        template: this.app.template('template-contests'),
        data: {
          models: this.app.contestsSearch,
          title: 'Search for "' + term + '"'
        },
        partials: {
          contest: this.app.template('template-contest'),
          loading: this.app.template('template-loading')
        },
        adaptors: [ 'Backbone' ]
      });
      this.app.contestsSearchView.observeTitle(this.app.options.originalTitle);
      this.reFocus();
    },

    // Single contest route.  Creates contest model, fetches it
    // and renders view into application container.
    routeContest: function(contest) {
      this.teardownObjects();

      this.app.contest = new this.app.ContestModel({ id: contest }, { app: this.app });
      this.app.contest.connect();
      this.app.contestView = new this.app.ContestView({
        el: this.app.$el.find('.content-container'),
        template: this.app.template('template-contest'),
        data: this.app.contest,
        partials: {
          loading: this.app.template('template-loading')
        },
        adaptors: [ 'Backbone' ]
      });
      this.app.contestView.observeTitle(this.app.options.originalTitle);
      this.reFocus();
    },

    // Route based different places.  If no place, then geolocate user,
    // if lat,lon, then handle that, otherwise assume an address.
    routeLocation: function(place) {
      var thisRouter = this;
      this.teardownObjects();

      // Handle location
      function handleLocation(lonlat) {
        thisRouter.app.locationContests = new thisRouter.app.ContestsLocationCollection(
          [], {
            app: thisRouter.app,
            lonlat: lonlat
          });
        thisRouter.app.locationContests.fetchBoundaryFromCoordinates();
        thisRouter.app.contestsLocationView = new thisRouter.app.ContestsView({
          el: thisRouter.app.$el.find('.content-container'),
          template: thisRouter.app.template('template-contests'),
          data: {
            models: thisRouter.app.locationContests,
            title: (place) ? 'Contests for "' + place + '"' : 'Contests for your location',
            lonlat: lonlat
          },
          partials: {
            contest: thisRouter.app.template('template-contest'),
            loading: thisRouter.app.template('template-loading')
          },
          adaptors: [ 'Backbone' ]
        });
        thisRouter.app.contestsLocationView.observeTitle(thisRouter.app.options.originalTitle);
        thisRouter.reFocus();
      }

      // Check for place format.  If no place, use geolocation, otherwise look
      // for a non-address and valid lat/lon, otherwise, assume address.
      if (!place) {
        this.geolocate().done(function(lonlat) {
          handleLocation(lonlat);
        });
      }
      else if (!/[a-zA-Z]+/.test(place) && !_.isNaN(parseFloat(place.split(',')[0])) && !_.isNaN(parseFloat(place.split(',')[1]))) {
        handleLocation([parseFloat(place.split(',')[0]), parseFloat(place.split(',')[1])]);
      }
      else {
        this.addressLocate(place).done(function(lonlat) {
          handleLocation(lonlat);
        });
      }
    },

    // Find location based on browser, returns promise.
    geolocate: function() {
      var thisRouter = this;
      var defer = $.Deferred();

      navigator.geolocation.getCurrentPosition(function(position) {
        defer.resolveWith(thisRouter, [[ position.coords.longitude, position.coords.latitude ]]);
      }, function(err) {
        defer.rejectWith(thisRouter, [{ 'message' : 'Issue retrieving current position.' }]);
      });

      return defer.promise();
    },

    // Find location based on address, returns promise.
    addressLocate: function(address) {
      var thisRouter = this;
      var defer = $.Deferred();
      var url = this.app.options.mapQuestQuery.replace('[[[KEY]]]', this.app.options.mapQuestKey)
        .replace('[[[ADDRESS]]]', encodeURIComponent(address));

      $.ajax({
        dataType: 'jsonp',
        url: url
      }).done(function(response) {
          var latlng;

          if (_.size(response.results[0].locations) > 0 &&
            _.isObject(response.results[0].locations[0].latLng)) {
            latlng = response.results[0].locations[0].latLng;
            defer.resolveWith(thisRouter, [[latlng.lng, latlng.lat]]);
          }
          else {
            defer.rejectWith(thisRouter,  [{ 'message' : 'Issue retrieving position from address.' }]);
          }
        })
        .fail(function() {
          defer.rejectWith(thisRouter, arguments);
        });

      return defer.promise();
    },

    // Since we can change view drastically, we need to scoll back up to the
    // top on new.  But we don't want to do it the first time
    reFocus: function() {
      if (this.viewed) {
        $('html, body').animate({ scrollTop: this.app.$el.offset().top - 5}, 750);
      }
      this.viewed = true;
    },

    // Tear down any existing objects
    teardownObjects: function() {
      var thisRouter = this;
      var views = ['contestView', 'contestsSearchView', 'contestsLocationView'];
      var models = ['contest', 'contestsSearch', 'locationContests'];

      // Merge in dashboard contests
      if (_.isObject(this.app.dashboardContests)) {
        models = _.union(models, _.keys(this.app.dashboardContests));
      }

      // Handle backbone objects
      _.each(models, function(m) {
        if (_.isObject(thisRouter.app[m])) {
          thisRouter.app[m].stopListening();
          thisRouter.app[m].disconnect();
        }
      });
      // Handle ractive objects
      _.each(views, function(v) {
        if (_.isObject(thisRouter.app[v])) {
          if (_.isObject(thisRouter.app[v].map)) {
            // Not sure why, but removing the map fails most of the time
            // and really screws things up
            //thisRouter.app[v].map.remove();
          }
          thisRouter.app[v].teardown();
        }
      });
    }
  });
})(mpApps['minnpost-elections-dashboard'], jQuery);