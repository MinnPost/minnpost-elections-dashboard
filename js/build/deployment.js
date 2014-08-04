// We do some tom foolery here to determine what deployment
// to use when developing locally.  This just makes it easier
// to maintain a single HTML file for testing.

(function() {
  var projectName = 'minnpost-elections-dashboard';

  // Parse query string
  var parseQueryString = function() {
    var assoc  = {};
    var decode = function(s) {
      return decodeURIComponent(s.replace(/\+/g, ' '));
    };
    var queryString = location.search.substring(1);
    var keyValues = queryString.split('&');
    var i;

    for (i = 0; i < keyValues.length; i++) {
      var key = keyValues[i].split('=');
      if (key.length > 1) {
        assoc[decode(key[0])] = decode(key[1]);
      }
    }

    return assoc;
  };

  // Add script to page
  var addScript = function(url) {
    /*
    var head = document.getElementsByTagName('head').item(0);
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    head.appendChild(script);
    */

    // Not the best way, but this seems to be synchronous
    document.write('<script src="' + url + '"><\/script>');
  };

  // Should be true or false, defaults to false
  var mpEmbed = (parseQueryString().mpEmbed === 'true');
  // Should be local, build, or deploy, defaults to local
  var mpDeployment = parseQueryString().mpDeployment || 'local';

  // Make function to use later
  window.mpMakeDeployment = function() {
    // Embed with build
    if (mpEmbed && mpDeployment === 'build') {
      addScript('dist/' + projectName + '.latest.embed.min.js');
    }
    // Embed with deploy
    else if (mpEmbed && mpDeployment === 'deploy') {
      addScript('https://s3.amazonaws.com/data.minnpost/projects/' + projectName + '/' + projectName + '.latest.embed.min.js');
    }
    // No embed local
    else if (!mpEmbed && mpDeployment === 'local') {
      addScript('bower_components/requirejs/require.js');
      addScript('js/config.js');
      addScript('js/app.js');
      addScript('js/build/wrapper.end.js');
    }
    // No embed build
    else if (!mpEmbed && mpDeployment === 'build') {
      addScript('dist/' + projectName + '.libs.min.js');
      addScript('dist/' + projectName + '.latest.min.js');
    }
    // No embed deploy (default)
    else if (!mpEmbed && (!mpDeployment || mpDeployment === 'deploy')) {
      addScript('https://s3.amazonaws.com/data.minnpost/projects/' + projectName + '/' + projectName + '.libs.min.js');
      addScript('https://s3.amazonaws.com/data.minnpost/projects/' + projectName + '/' + projectName + '.latest.min.js');
    }
  };
})();
