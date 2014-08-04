/* global module:false */

/**
 * Grunt file that handles managing tasks such as rendering
 * SASS, providing a basic HTTP server, building a
 * distribution, and deploying.
 */
module.exports = function(grunt) {
  var _ = grunt.util._;

  // Bower has an extra, custom section to manage where files are.  Order of
  // list matters.
  var bower = grunt.file.readJSON('bower.json');
  var components = bower.dependencyMap;
  var componentParts = {
    js: _.map(_.compact(_.flatten(_.pluck(components, 'js'))), function(c) {
      return 'bower_components/' + c + '.js';
    }),
    css: _.map(_.compact(_.flatten(_.pluck(components, 'css'))), function(c) {
      return 'bower_components/' + c + '.css';
    }),
    ie: _.map(_.compact(_.flatten(_.pluck(components, 'ie'))), function(c) {
      return 'bower_components/' + c + '.css';
    })
  };

  // Project configuration.  Many values are directly read from
  // package.json.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") + "\\n" %>' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= pkg.license || _.pluck(pkg.licenses, "type").join(", ") %> */' +
        '<%= "\\n\\n" %>',
      bannerLatest: '/*! <%= pkg.title || pkg.name %> - LATEST VERSION - ' +
        '<%= grunt.template.today("yyyy-mm-dd") + "\\n" %>' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= pkg.license || _.pluck(pkg.licenses, "type").join(", ") %> */' +
        '<%= "\\n\\n" %>'
    },
    components: components,
    componentParts: componentParts,

    // Clean up the distribution fold
    clean: {
      folder: 'dist/'
    },

    // JS Hint checks code for coding styles and possible errors
    jshint: {
      options: {
        curly: true,
        //es3: true,
        forin: true,
        latedef: true,
        //maxlen: 80,
        indent: 2
      },
      files: ['Gruntfile.js', 'js/*.js', 'data/processing/*.js']
    },


    // Compass is an extended SASS.  Set it up so that it generates to .tmp/
    compass: {
      options: {
        sassDir: 'styles',
        cssDir: '.tmp/css',
        generatedImagesDir: '.tmp/images',
        fontsDir: 'styles/fonts',
        imagesDir: 'images',
        javascriptsDir: 'js',
        importPath: 'bower_components',
        httpPath: './',
        relativeAssets: true
      },
      dist: {
        options: {
          environment: 'production',
          outputStyle: 'expanded',
          relativeAssets: false,
          cssDir: '.tmp/dist_css',
          generatedImagesDir: '.tmp/dist_css/images'
        }
      },
      dev: {
        options: {
          debugInfo: true
        }
      }
    },


    // Copy relevant files over to distribution
    copy: {
      images: {
        files: [
          {
            cwd: './images/',
            expand: true,
            src: ['**'],
            dest: 'dist/images/'
          }
        ]
      },
      data: {
        files: [
          {
            cwd: './data/',
            expand: true,
            filter: 'isFile',
            src: ['**/*.json'],
            dest: 'dist/data/'
          }
        ]
      }
    },

    // R.js to bring together files through requirejs.  We have two main builds.
    // The first is the application build, for application, we exclude libraries
    // and compile them separately for network efficiency as these will change
    // less often than the application code.
    //
    // The second is for embedding which puts all the JS together.
    requirejs: {
      app: {
        options: {
          name: '<%= pkg.name %>',
          // Exclude libraries
          exclude: _.compact(_.flatten(_.pluck(_.filter(components, function(c) { return (c.js !== undefined); }), 'rname'))),
          baseUrl: 'js',
          mainConfigFile: 'js/config.js',
          out: 'dist/<%= pkg.name %>.latest.js',
          optimize: 'none'
        }
      },
      libs: {
        options: {
          // Include just libraries
          include: _.compact(_.flatten(_.pluck(_.filter(components, function(c) { return (c.js !== undefined); }), 'rname'))),
          exclude: ['requirejs'],
          baseUrl: 'js',
          mainConfigFile: 'js/config.js',
          out: 'dist/<%= pkg.name %>.libs.js',
          optimize: 'none',
          wrap: {
            startFile: 'js/build/wrapper.start.js',
            endFile: 'js/build/wrapper.end.js'
          }
        }
      },
      embed: {
        options: {
          name: '<%= pkg.name %>',
          include: ['almond'],
          exclude: ['requirejs'],
          baseUrl: 'js',
          mainConfigFile: 'js/config.js',
          out: 'dist/<%= pkg.name %>.embed.latest.js',
          optimize: 'none',
          wrap: {
            startFile: 'js/build/wrapper.start.js',
            endFile: 'js/build/wrapper.end.js'
          }
        }
      }
    },

    // Brings files toggether.  We make versioned files so that when deployed,
    // there is a versioned and latest which allows to work and deploy
    // without overriding exising published pieces.
    concat: {
      options: {
        separator: '\r\n\r\n'
      },
      // JS version
      js: {
        src: ['<%= requirejs.app.options.out %>'],
        dest: 'dist/<%= pkg.name %>.<%= pkg.version %>.js'
      },
      jsEmbed: {
        src: ['<%= requirejs.embed.options.out %>'],
        dest: 'dist/<%= pkg.name %>.<%= pkg.version %>.embed.js'
      },
      // CSS
      css: {
        src: [

          '<%= compass.dist.options.cssDir %>/main.css'
        ],
        dest: 'dist/<%= pkg.name %>.<%= pkg.version %>.css'
      },
      cssLatest: {
        src: ['<%= concat.css.src %>'],
        dest: 'dist/<%= pkg.name %>.latest.css'
      },
      // CSS Libs
      cssLibs: {
        src: _.isEmpty(componentParts.css) ? ['nofile'] : componentParts.css,
        dest: 'dist/<%= pkg.name %>.libs.css'
      },
      cssIeLibs: {
        src: _.isEmpty(componentParts.ie) ? ['nofile'] : componentParts.ie,
        dest: 'dist/<%= pkg.name %>.libs.ie.css'
      }
    },

    // Minify JS for network efficiency
    uglify: {
      options: {
        banner: '<%= meta.banner %>'
      },
      js: {
        src: ['<%= concat.js.dest %>'],
        dest: 'dist/<%= pkg.name %>.<%= pkg.version %>.min.js'
      },
      jsEmbed: {
        src: ['<%= concat.jsEmbed.dest %>'],
        dest: 'dist/<%= pkg.name %>.<%= pkg.version %>.embed.min.js'
      },
      jsLatest: {
        options: {
          banner: '<%= meta.bannerLatest %>'
        },
        src: ['<%= concat.js.dest %>'],
        dest: 'dist/<%= pkg.name %>.latest.min.js'
      },
      jsLatestEmbed: {
        options: {
          banner: '<%= meta.bannerLatest %>'
        },
        src: ['<%= concat.jsEmbed.dest %>'],
        dest: 'dist/<%= pkg.name %>.latest.embed.min.js'
      },
      jsLibs: {
        options: {
          banner: ''
        },
        src: ['dist/<%= pkg.name %>.libs.js'],
        dest: 'dist/<%= pkg.name %>.libs.min.js'
      }
    },

    // Minify CSS for network efficiency
    cssmin: {
      options: {
        banner: '<%= meta.banner %>',
        report: true
      },
      css: {
        src: ['<%= concat.css.dest %>'],
        dest: 'dist/<%= pkg.name %>.<%= pkg.version %>.min.css'
      },
      cssLatest: {
        options: {
          banner: '<%= meta.bannerLatest %>'
        },
        src: ['<%= concat.css.dest %>'],
        dest: 'dist/<%= pkg.name %>.latest.min.css'
      },
      cssLibs: {
        options: {
          banner: ''
        },
        src: ['<%= concat.cssLibs.dest %>'],
        dest: 'dist/<%= pkg.name %>.libs.min.css'
      },
      cssIeLibs: {
        options: {
          banner: ''
        },
        src: ['<%= concat.cssIeLibs.dest %>'],
        dest: 'dist/<%= pkg.name %>.libs.min.ie.css'
      }
    },

    // Deploy to S3
    s3: {
      options: {
        // This is specific to MinnPost
        //
        // These are assumed to be environment variables:
        //
        // AWS_ACCESS_KEY_ID
        // AWS_SECRET_ACCESS_KEY
        //
        // See https://npmjs.org/package/grunt-s3
        //key: 'YOUR KEY',
        //secret: 'YOUR SECRET',
        bucket: 'data.minnpost',
        access: 'public-read',
        gzip: true
      },
      mp_deploy: {
        upload: [
          {
            src: 'dist/*',
            dest: 'projects/<%= pkg.name %>/'
          },
          {
            src: 'dist/data/**/*',
            dest: 'projects/<%= pkg.name %>/data/',
            rel: 'dist/data'
          },
          {
            src: 'dist/images/**/*',
            dest: 'projects/<%= pkg.name %>/images/',
            rel: 'dist/images'
          }
        ]
      }
    },
    // HTTP Server
    connect: {
      server: {
        options: {
          port: 8899
        }
      }
    },
    // Watches files for changes and performs task
    watch: {
      files: ['<%= jshint.files %>', 'styles/*.scss'],
      tasks: 'watcher'
    }
  });

  // Load plugin tasks
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-s3');

  // Custom task to output embed code when deploy is run, if the project is Inline
  grunt.registerTask('inline_embed', 'Embed code generation.', function(name) {
    grunt.log.writeln('To embed this in an article, use the following.  For full page article, copy relevant code from index-deploy.html.');
    grunt.log.writeln('=====================================');
    grunt.log.writeln('<div id="' + name + '-container mp"></div>');
    grunt.log.writeln('<script type="text/javascript" src="https://s3.amazonaws.com/data.minnpost/projects/' + name + '/' + name + '.embed.latest.min.js"></script>');
    grunt.log.writeln('=====================================');
  });

  // Default build task
  grunt.registerTask('default', ['jshint', 'compass:dist', 'clean', 'copy', 'requirejs', 'concat', 'cssmin', 'uglify']);

  // Watch tasks

  grunt.registerTask('watcher', ['jshint', 'compass:dev']);
  grunt.registerTask('server', ['jshint', 'compass:dev', 'connect', 'watch']);


  // Deploy tasks
  grunt.registerTask('deploy', ['s3', 'inline_embed:minnpost-elections-dashboard']);

};
