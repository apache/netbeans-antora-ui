'use strict'

const { src } = require('gulp')
const eslint = require('gulp-eslint-new')
const sass = require('gulp-sass')(require('sass'))
const vfs = require('vinyl-fs')
const zip = require('gulp-vinyl-zip')
const merge = require('merge-stream')
const rename = require('gulp-rename')
const srcDir = 'src'
const previewDestDir = 'public'
const destDir = `${previewDestDir}/_`
const buildDir = 'build'
const path = require('path')

async function taskJSLint () {
  return src(['gulpfile.js'])
    .pipe(eslint())
    .pipe(eslint.format())
}

async function scss () {
  const opts = { base: srcDir, cwd: srcDir }
  return vfs.src('scss/*.scss', opts)
    .pipe(sass())
    .pipe(rename('css/netbeans.css'))
    .pipe(vfs.dest(destDir))
}

async function bundle () {
  const opts = { base: srcDir, cwd: srcDir }
  scss()
  return merge(
    vfs.src('fonts/*.{ttf,woff*(2),svg,eot}', opts),
    vfs.src('css/*.css', opts),
    vfs.src('js/**/*.js', opts),
    // here we exclude some script for conversion
    vfs.src('helpers/*.js', opts),
    vfs.src('images/**/*.{svg,png,gif,jpg}', opts),
    vfs.src('images/fav/browserconfig.xml', opts),
    vfs.src('images/fav/site.webmanifest', opts),
    vfs.src('images/fav/favicon.ico', opts),
    vfs.src('layouts/*.hbs', opts),
    vfs.src('partials/*.hbs', opts))
    .pipe(vfs.dest(destDir))
}

async function buildTask (cb) {
  taskJSLint()
  bundle()
}

async function bundleTask (cb) {
  buildTask()
  vfs
    .src('**/*', { base: destDir, cwd: destDir })
    .pipe(zip.dest(path.join(buildDir, 'netbeans-ui-bundle.zip')))
}

module.exports = {
  build: buildTask,
  bundle: bundleTask,
}
