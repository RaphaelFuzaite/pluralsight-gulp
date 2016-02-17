var gulp = require('gulp');
var args = require('yargs').argv;

var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var util = require('gulp-util');
var gulpprint = require('gulp-print');
var gulpif = require('gulp-if');

gulp.task('vet', function() {
    log('Analyzing source with JSHint and JSCS');
	return gulp
		.src([
			'./src/**/*.js',
			'./*.js'
		])
		// Passando o argumento --verbose, irá executar a condição do gulp-if,
		// no caso, exibirá todos os arquivos que estão sendo manipulados
		.pipe(gulpif(args.verbose, gulpprint()))
		.pipe(jscs())
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish', { verbose: true }))
		.pipe(jshint.reporter('fail'));
});

function log(msg) {
    if (typeof(msg) === 'object') {
		for (var item in msg) {
			if (msg.hasOwnProperty(item)) {
				util.log(util.colors.blue(msg[item]));
			}
		}
	} else {
		util.log(util.colors.blue(msg));
	}
}