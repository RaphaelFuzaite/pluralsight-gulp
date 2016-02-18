var gulp = require('gulp');
var args = require('yargs').argv;
var browserSync = require('browser-sync');
var config = require('./gulp.config')();
var del = require('del');
var path = require('path');
var _ = require('lodash');
var $ = require('gulp-load-plugins')({ lazy: true });
var port = process.env.PORT || config.defaultPort;

function log(msg) {
    if (typeof (msg) === 'object') {
        var item;
		for (item in msg) {
			if (msg.hasOwnProperty(item)) {
				$.util.log($.util.colors.blue(msg[item]));
			}
		}
	} else {
		$.util.log($.util.colors.blue(msg));
	}
}

function clean(path) {
	log('Cleaning: ' + $.util.colors.blue(path));
	del(path);
}

function errorLogger (error) {
	log('*** Start of Error ***');
	log(error);
	log('*** End of Error ***');
	this.emit('end');
}

function changeEvent(event) {
	var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
	log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
} 

function startBrowserSync(isDev, specRunner) {
	if (args.nosync || browserSync.active) {
		return;
	}
	
	log('Starting browser-sync on port ' + port);
	
	if (isDev) {
		gulp.watch([config.less], ['styles'])
		.on('change', function (ev) { changeEvent(ev); });	
	} else {
		gulp.watch([config.less, config.js, config.html], ['optimize', browserSync.reload])
		.on('change', function (ev) { changeEvent(ev); });
	}
	
	var options = {
		proxy: 'localhost:' + port,
		port: 3000,
		files: isDev ? [
			config.client + '**/**.*',
			'!' + config.less,
			config.temp + '**/**.css'
		] : [],
		ghostMode: {
			clicks: true,
			location: false,
			forms: true,
			scroll: true
		},
		injectChanges: true,
		logFileChanges: true,
		logLevel: 'debug',
		logPrefix: 'gulp-patterns',
		notify: true,
		reloadDelay: 1000
	}; 
	
	if(specRunner) {
		options.startPath = config.specRunnerFile;
	}
	
	browserSync(options);
}

function serve(isDev, specRunner) {
		
	var nodeOptions = {
		script: config.nodeServer,
		delatyTime: 1,
		env: {
			'PORT': port,
			'NODE_ENV': isDev ? 'dev' : 'build'
		},
		watch: [config.server]	
	};
	
	return $.nodemon(nodeOptions)
		.on('restart', function (ev) {
			log('*** nodemon restarted');
			log('files changed on restart: \n' + ev);
			setTimeout(function(){
				browserSync.notify('Reloading now...');
				browserSync.reload({ stream: false });
			}, config.browserReloadDelay); 
		})
		.on('start', function () {
			log('*** nodemon started');
			startBrowserSync(isDev, specRunner);
		})
		.on('crash', function () {
			log('*** nodemon crashed: script crashed for some reason');
		})
		.on('exit', function () {
			log('*** nodemon exited cleanly');
		});
}

function startTest(singleRun, done) {
	var child;
	var fork = require('child_process').fork;
	var karma = require('karma').server;
	var excludeFiles = [];
	var serverSpecs = config.serverIntegrationSpecs;
	
	if	(args.startServers) {
		log('Starting server');
		var savedEnv = process.env;
		savedEnv.NODE_ENV = 'dev';
		savedEnv.PORT = 8888;
		child = fork(config.nodeServer);
	} else {
		if (serverSpecs && serverSpecs.length) {
			excludeFiles = serverSpecs;
		}	
	}
	
	karma.start({
		configFile: __dirname + '/karma.conf.js',
		exclude: excludeFiles,
		singleRun: !!singleRun
	}, karmaCompleted);
	
	function karmaCompleted(karmaResult) {
		log('karma completed!');
		
		if (child) {
			log('Shutting down the child process');
			child.kill();
		}
		
		if (karmaResult === 1) {
			done('karma: tests failed with code: ' + karmaResult);
		} else {
			done();
		 }
	}
}

function notify(options) {
	var notifier = require('node-notifier');
	var notifyOptions = {
		sound: 'Bottle',
		contentImage: path.join(__dirname, 'gulp.png'),
		icon: path.join(__dirname, 'gulp.png')	
	};
	_.assing(notifyOptions, options);
	notifier.notify(notifyOptions);
}

gulp.task('help', $.taskListing);
gulp.task('default', ['help']);

gulp.task('vet', function () {
    log('Analyzing source with JSHint and JSCS');
	return gulp
		.src(config.alljs)
		// Passando o argumento --verbose, irá executar a condição do gulp-if,
		// no caso, exibirá todos os arquivos que estão sendo manipulados
		.pipe($.if(args.verbose, $.print()))
		.pipe($.jscs())
		.pipe($.jshint())
		.pipe($.jshint.reporter('jshint-stylish', { verbose: true }))
		.pipe($.jshint.reporter('fail'));
});

gulp.task('clean', function () {
	var delconfig = [].concat(config.build, config.temp);
	log('Cleaning: ' + $.util.colors.blue(delconfig));
	del(delconfig);
});

gulp.task('clean-fonts', function () {
	clean(config.build + 'fonts/**/*.*');
});

gulp.task('clean-images', function () {
	clean(config.build + 'images/**/*.*');
});

gulp.task('clean-styles', function () {
	clean(config.temp + '**/*.css');
});

gulp.task('clean-code', function () {
	var files = [].concat(
		config.temp + '**/*.js',
		config.build + '**/*.html',
		config.build + 'js/**/*.js'
	);
	clean(files);
});

gulp.task('templatecache', ['clean-code'], function () {
	log('Creating AngularJs $templateCache');
	
	return gulp
		.src(config.htmltemplates)
		.pipe($.minifyHtml({ empty: true }))
		.pipe($.angularTemplatecache(
			config.templateCache.file,
			config.templateCache.options
		))
		.pipe(gulp.dest(config.temp));
});

gulp.task('less-watcher', function() {
	gulp.watch([config.less], ['styles']);
});

gulp.task('styles', ['clean-styles'], function () {
	log('Compiling Less --> CSS');
	
	return gulp
		.src(config.less)
		.pipe($.plumber())
		.pipe($.less())
		//.on('error', errorLogger)
		.pipe($.autoprefixer({ browsers: ['last 2 versions', '> 5%'] }))
		.pipe(gulp.dest(config.temp));
});

gulp.task('fonts', ['clean-fonts'], function () {
	log('Copying fonts...');
	
	return gulp
		.src(config.fonts)
		.pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images', ['clean-images'], function () {
	
	log('Copying and compressing images...');
	
	return gulp
		.src(config.images)
		.pipe($.imagemin({ optimizationLevel: 4 }))
		.pipe(gulp.dest(config.build + 'images'));
});

gulp.task('wiredep', function () {
	log('Wire up the bower css js and our app js into the html');
	
	var wiredep = require('wiredep').stream;
	var options = config.getWiredepDefaultOptions();
	return gulp
		.src(config.index)
		.pipe(wiredep(options))
		.pipe($.inject(gulp.src(config.js)))
		.pipe(gulp.dest(config.client));
});

gulp.task('inject', ['wiredep', 'styles'], function () {
	log('Inject our app css into the html');
	
	return gulp
		.src(config.index)
		.pipe($.inject(gulp.src(config.css)))
		.pipe(gulp.dest(config.client));
});

gulp.task('build', ['optimize', 'images', 'fonts'], function () {
	log('Building everything....');
	
	var msg = {
		title: 'gulp build',
		subtitle: 'Deployed to the build folder',
		message: 'Running `gulp serve-build`'
	};
	del(config.temp);
	log(msg);
	notify(msg);
});

gulp.task('serve-specs', ['build-specs'], function(done) {
	log('run the spec runner');
	serve(true, true);
	done();
});

gulp.task('build-specs', ['templatecache'], function(){
	log('building the spec runner');
	
	var wiredep = require('wiredep').stream;
	var options = config.getWiredepDefaultOptions();
	var specs = config.specs;
	
	options.devDependencies = true;
	
	if (args.startServers) {
		specs = [].concat(specs, config.serverIntegrationSpecs); 
	}
	
	return gulp
		.src(config.specRunner)
		.pipe(wiredep(options))
		.pipe($.inject(	gulp.src(config.testlibraries, { read: false }),
						{ name: 'inject:testlibraries' }))
		.pipe($.inject(gulp.src(config.js, { read: false })))
		.pipe($.inject(	gulp.src( config.specHelpers, { read: false }),
						{ name: 'inject:spechelpers'}))
		.pipe($.inject(	gulp.src( specs, { read: false }),
						{ name: 'inject:specs' }))
		.pipe($.inject(	gulp.src(config.temp + config.templateCache.file, { read: false }),
						{ name: 'inject:templates' }))
		.pipe(gulp.dest(config.client));
});

gulp.task('optimize', ['inject', 'test'], function () {
	log('Optimizing the javascript, css, html');

	var assets = $.useref.assets({ searchPath: './' });
	var templateCache = config.temp + config.templateCache.file;
	var cssFilter = $.filter('**/*.css', { restore: true });
	var jsLibFilter = $.filter('**/' + config.optimized.lib, { restore: true });
	var jsAppFilter = $.filter('**/' + config.optimized.app, { restore: true });
		
	return gulp
		.src(config.index)
		.pipe($.plumber())
		.pipe($.inject(gulp.src(templateCache, { read: false }, {
			starttag: '<!-- inject:templates.js -->'
		})))
		.pipe(assets)
		
		.pipe(cssFilter)
		.pipe($.csso())
		.pipe(cssFilter.restore)
		
		.pipe(jsLibFilter)
		.pipe($.uglify())
		.pipe(jsLibFilter.restore)
		
		.pipe(jsAppFilter)
		.pipe($.ngAnnotate({add: true}))
		.pipe($.uglify())
		.pipe(jsAppFilter.restore)
		
		.pipe($.rev())
		.pipe(assets.restore())
		.pipe($.useref())
		.pipe($.revReplace())
		.pipe(gulp.dest(config.build))
		
		.pipe($.rev.manifest())
		.pipe(gulp.dest(config.build));
});

/**
 * Bump the version
 * --type=pre will bump the prerelease version *.*.*-x
 * --type=pacth or no flag will bump the patch version *.*.x
 * --type=minor will bump the minor version *.x.*
 * --type=major will bump the major version x.*.*
 * --version=1.2.3 will bump to a specific version and ignore other flags
 */

gulp.task('bump', function () {
	var msg = 'Bumping versions';
	var type = args.type;
	var version = args.version;
	var options = {};
	
	if (version) {
		options.version = version;
		msg += ' to ' + version;
	} else {
		options.type = type;
		msg += ' for a ' + type;
	}
	log(msg);
	
	return gulp
		.src(config.packages)
		.pipe($.bump(options))
		.pipe(gulp.dest(config.root));
	
});

gulp.task('serve-build', ['build'], function () {
	serve(false);
});

gulp.task('serve-dev', ['inject'], function () {
	serve(true);
});

gulp.task('test', ['vet', 'templatecache'], function (done) {
	startTest(true, done);
});

gulp.task('autotest', ['vet', 'templatecache'], function (done) {
	startTest(false, done);
});