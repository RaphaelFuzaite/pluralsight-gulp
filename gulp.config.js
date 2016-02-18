module.exports = function() {
	var client = './src/client/';
	var clientApp = client + 'app/';
	var report = './report/';
	var server = './src/server/';
	var specRunnerFile = 'specs.html';
	var temp = './.tmp/';
	var root = './';
	var wiredep = require('wiredep');
	var bowerFiles = wiredep({ devDependencies: true })['js'];
	
	var config = {
		
		/**
		 * File paths
		 */
		alljs: [
			'./src/**/*.js',
			'./*.js'
		],
		build: './build/',
		client: client,
		css: temp + 'styles.css',
		fonts: './bower_components/font-awesome/fonts/**/*.*',
		images: client + 'images/**/*.*',
		html: clientApp +  '**/*.html',
		htmltemplates: clientApp +  '**/*.html',
		index: client + 'index.html',
		js: [
			clientApp + '**/*.module.js',
			clientApp + '**/*.js',
			'!' + clientApp + '**/*.spec.js'
		],
		less: client + 'styles/styles.less',
		report: report,
		temp: temp,
		server: server,
		root: root,
		/**
		 * Browser sync
		 */
		browserReloadDelay: 1000,
		/**
		 * Template cache
		 */
		templateCache: {
			file: 'templates.js',
			options: {
				module: 'app.core',
				standAlone: false,
				root: 'app/'
			}	
		},
		/**
		 * Bower and NPM locations 
		**/
		bower: {
			json: require('./bower.json'),
			directory: './bower_components',
			ignorePath: '../..'
		},
		
		/**
		 * Package file locations
		 */
		packages: [
			'./package.json',
			'./bower.json'
		],
		
		/**
		 * Optimized files
		 */
		optimized: {
			app: 'app.js',
			lib: 'lib.js'	
		},
		
		/**
		 * Spec runner files
		 */
		specRunner: client + specRunnerFile,
		specRunnerFile: specRunnerFile,
		testlibraries: [
			'node_modules/mocha/mocha.js',
			'node_modules/chai/chai.js',
			'node_modules/mocha-clean/index.js',
			'node_modules/sinon-chai/lib/sinon-chai.js'
		],
		specs: [clientApp + '**/*.spec.js'],
		
		/**
		 * Karma and testing settings
		 */
		specHelpers: [
			client + 'test-helpers/*.js'
		],
		serverIntegrationSpecs: [
			client + 'tests/server-integration/**/*.spec.js'
		],
		
		/**
		 * Node settings
		 */
		defaultPort: 7203,
		nodeServer: './src/server/app.js'
		 
	};
	
	config.getWiredepDefaultOptions = function () {
		var options = {
			bowerJson: config.bower.json,
			directory: config.bower.directory,
			ignorePath: config.bower.ignorePath	
		};
		
		return options;
	};
	
	config.karma = getKarmaOptions();
	
	return config;
	
	function getKarmaOptions() {
		var options = {
			files: [].concat(
				bowerFiles,
				config.specHelpers,
				client + '**/*.module.js',
				client + '**/*.js',
				temp + config.templateCache,
				config.serverIntegrationSpecs
			),
			exlude: [],
			coverage: {
					dir: report + 'coverage',
					reporters: [
						{ type: 'html', subdir: 'report-html' },
						{ type: 'lcov', subdir: 'report-lcov' },
						{ type: 'text-summary' }
					]
			},
			preprocessors: {}
		};
		options.preprocessors[clientApp + '**/!(*.spec)+(.js)'] = ['coverage'];
		return options;
	}		
};