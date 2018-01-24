var gulp = require('gulp');
var clean = require('gulp-clean')
var uglify = require('gulp-uglify')
var concat = require('gulp-concat');
var rename = require('gulp-rename');


gulp.task('default', function(){
    gulp.src('dist', {read:false})
        .pipe(clean())
    gulp.src(['js/three.min.js', 'js/hammer.min.js', 'js/TDSLoader.js', 'js/OrbitControls.js', 'js/tweenjs-0.6.2.min.js'])
        .pipe(concat('vendor.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist'));
    gulp.src('js/webShop.js')
        .pipe(gulp.dest('dist'))
        .pipe(uglify())
        .pipe(rename('webShop.min.js'))
        .pipe(gulp.dest('dist'))
})