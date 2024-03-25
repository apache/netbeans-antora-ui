'use strict'

const { src, series } = require('gulp')
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

const buildonly = series(taskJSLint, scss, prepareassets)
const buildandzip = series(taskJSLint, scss, prepareassets, zipbundle)

module.exports = {
  build: buildonly,
  bundle: buildandzip,
}
