var gulp = require('gulp');
var args = require('yargs').argv;
var config = require('./gulp.config')();
var del = require('del');

var $ = require('gulp-load-plugins')({ lazy: true });

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

gulp.task('clean-styles', function () {
	var files = config.temp + '**/*.css';
	clean(files);
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