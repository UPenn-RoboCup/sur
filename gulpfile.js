var require = require;
var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var mainBowerFiles = require('main-bower-files');

gulp.task('concat_libs', function () {
	"use strict";
	console.log(mainBowerFiles())
	return gulp.src(mainBowerFiles())
		.pipe(sourcemaps.init())
		.pipe(concat('ext.min.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('public/js'));
});
gulp.task('concat_app', function () {
	"use strict";
	return gulp.src('app/*.js')
		.pipe(sourcemaps.init())
		.pipe(concat('app.min.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('public/js'));
});
gulp.task('default', ['concat_libs', 'concat_app']);
