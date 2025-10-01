'use strict'

const { src, series, parallel } = require('gulp')
const eslint = require('gulp-eslint-new')
const sass = require('gulp-sass')(require('sass'))
const vfs = require('vinyl-fs')
const zip = require('@vscode/gulp-vinyl-zip')
const rename = require('gulp-rename')
const srcDir = 'src'
const previewDestDir = 'public'
const destDir = `${previewDestDir}/_`
const buildDir = 'build'
const path = require('path')

// check format file for gulp
function taskJSLint (cb) {
  src(['gulpfile.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .on('finish', cb)
}

function copyfoundationscss (cb) {
  const opts = { base: '', cwd: '' }
  vfs.src('node_modules/foundation-sites/scss/**/*', opts)
    .pipe(vfs.dest('src/scss/_vendor/foundation-sites/scss'))
    .on('finish', cb)
}

function copyhighlightjs (cb) {
  const opts = { base: '', cwd: '' }
  vfs.src('node_modules/@highlightjs/cdn-assets/highlight.min.js', opts)
    .pipe(vfs.dest('src/js/vendor'))
    .on('finish', cb)
}

function copyjqueryjs (cb) {
  const opts = { base: '', cwd: '' }
  vfs.src('node_modules/jquery/dist/jquery.min.js', opts)
    .pipe(vfs.dest('src/js/vendor'))
    .on('finish', cb)
}

function copyjquerycolorboxjs (cb) {
  const opts = { base: '', cwd: '' }
  vfs.src('node_modules/jquery-colorbox/jquery.colorbox-min.js', opts)
    .pipe(vfs.dest('src/js/vendor'))
    .on('finish', cb)
}

function copywhatinputjs (cb) {
  const opts = { base: '', cwd: '' }
  vfs.src('node_modules/what-input/dist/what-input.min.js', opts)
    .pipe(vfs.dest('src/js/vendor'))
    .on('finish', cb)
}

function copyhighlightcss (cb) {
  const opts = { base: '', cwd: '' }
  vfs.src('node_modules/@highlightjs/cdn-assets/styles/default.min.css', opts)
    .pipe(vfs.dest('src/css/highlightjs'))
    .on('finish', cb)
}

function copyfoundationvendor (cb) {
  const opts = { base: '', cwd: '' }
  vfs.src('node_modules/foundation-sites/_vendor/**/*', opts)
    .pipe(vfs.dest('src/scss/_vendor/foundation-sites/_vendor'))
    .on('finish', cb)
}

function copyfoundationjs (cb) {
  const opts = { base: '', cwd: '' }
  vfs.src('node_modules/foundation-sites/dist/js/foundation.min.js', opts)
    .pipe(vfs.dest('src/js/vendor/'))
    .on('finish', cb)
}

function copymotionui (cb) {
  const opts = { base: '', cwd: '' }
  vfs.src('node_modules/motion-ui/src/**/*', opts)
    .pipe(vfs.dest('src/scss/_vendor/motion-ui/'))
    .on('finish', cb)
}
// process scss
function scss (cb) {
  const opts = { base: srcDir, cwd: srcDir }
  vfs.src('scss/*.scss', opts)
    .pipe(sass())
    .pipe(rename('css/netbeans.css'))
    .pipe(vfs.dest(destDir))
    .on('finish', cb)
}

// copy our file to the destdir, filter to have what we want
function prepareassets (cb) {
  // buffer true lead to missing assets on vynl
  const srcopts = { base: srcDir, cwd: srcDir, strict: true, buffer: false, encoding: false }
  const destopts = { encoding: false }
  const assetsGlob = [
    'fonts/*.{ttf,woff*(2),svg,eot}',
    'css/*.css',
    'css/highlightjs/*.css',
    'js/**/*.js',
    'helpers/*.js',
    'images/**/*.{svg,png,gif,jpg}',
    'images/fav/browserconfig.xml',
    'images/fav/site.webmanifest',
    'images/fav/favicon.ico',
    'layouts/*.hbs',
    'partials/*.hbs']
  vfs.src(assetsGlob, srcopts).pipe(vfs.dest(destDir, destopts)).on('finish', cb)
}

// zip what's in destdir to netbeans-ui-bundle.zip
function zipbundle (cb) {
  vfs
    .src('**/*', { base: destDir, cwd: destDir, encoding: false })
    .pipe(zip.dest(path.join(buildDir, 'netbeans-ui-bundle.zip')))
    .on('finish', cb)
}

const copyfoundation = parallel(copyfoundationscss, copyfoundationvendor, copyfoundationjs)
const copyhighlight = parallel(copyhighlightjs, copyhighlightcss)
const copyjquery = parallel(copyjqueryjs, copyjquerycolorboxjs)
const copywhatinput = parallel(copywhatinputjs)
const buildonly = series(taskJSLint, copyfoundation, copyhighlight, copyjquery, copywhatinput, copymotionui, scss, prepareassets)
const buildandzip = series(taskJSLint, copyfoundation, copyhighlight, copyjquery, copywhatinput, copymotionui, scss, prepareassets, zipbundle)

module.exports = {
  build: buildonly,
  bundle: buildandzip,
}
