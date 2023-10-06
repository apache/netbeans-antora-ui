'use strict'

const { src } = require('gulp')
const eslint = require('gulp-eslint-new')
const sass = require('gulp-sass')(require('sass'))
const vfs = require('vinyl-fs')
const zip = require('gulp-vinyl-zip')
const merge = require('merge-stream')
const rename = require('gulp-rename')
const fs = require('fs-extra')
const handlebars = require('handlebars')
const yaml = require('js-yaml')
const requireFromString = require('require-from-string')
const srcDir = 'src'
const previewDestDir = 'public'
const destDir = `${previewDestDir}/_`
const previewSrcDir = 'preview-src'
const buildDir = 'build'
const path = require('path')
const ospath = require('path')
const { Transform } = require('stream')
const Asciidoctor = require('@asciidoctor/core')()
const map = (transform = () => {}, flush = undefined) => new Transform({ objectMode: true, transform, flush })
const ASCIIDOC_ATTRIBUTES = { experimental: '', icons: 'font', sectanchors: '', 'source-highlighter': 'highlight.js' }
async function taskJSLint () {
  return src(['gulpfile.js'])
    .pipe(eslint())
    .pipe(eslint.format())
}

/*async function taskJS2Lint () {
 return src(['src/js/netbeans.js'])
 .pipe(eslint())
 .pipe(eslint.format())
 }*/
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
    vfs.src('images/**/*.{svg,png,gif,jpg}', opts),
    vfs.src('layouts/*.hbs', opts),
    vfs.src('partials/*.hbs', opts))
    .pipe(vfs.dest(destDir))
}

async function buildTask (cb) {
  taskJSLint()
  bundle()
}

function copyImages (src, dest) {
  return vfs
    .src('**/*.{png,svg}', { base: src, cwd: src })
    .pipe(vfs.dest(dest))
    .pipe(map((file, enc, next) => next()))
}

function resolvePageURL (spec, context = {}) {
  if (spec) {
    return '/' + (spec = spec.split(':').pop()).slice(0, spec.lastIndexOf('.')) + '.html'
  }
}

function resolvePage (spec, context = {}) {
  if (spec) {
    return { pub: { url: resolvePageURL(spec) } }
  }
}

function loadSampleUiModel (src) {
  return fs.readFile(ospath.join(src, 'ui-model.yml'), 'utf8').then((contents) => yaml.safeLoad(contents))
}

function transformHandlebarsError ({ message, stack }, layout) {
  const m = stack.match(/^ *at Object\.ret \[as (.+?)\]/m)
  const templatePath = `src/${m ? 'partials/' + m[1] : 'layouts/' + layout}.hbs`
  const err = new Error(`${message}${~message.indexOf('\n') ? '\n^ ' : ' '}in UI template ${templatePath}`)
  err.stack = [err.toString()].concat(stack.substr(message.length + 8)).join('\n')
  return err
}

function compileLayouts (src) {
  const layouts = new Map()
  return vfs.src('layouts/*.hbs', { base: src, cwd: src }).pipe(
    map(
      (file, enc, next) => {
        const srcName = path.join(src, file.relative)
        layouts.set(file.stem, handlebars.compile(file.contents.toString(), { preventIndent: true, srcName }))
        next()
      },
      function (done) {
        this.push({ layouts })
        done()
      }
    )
  )
}

function registerPartials (src) {
  return vfs.src('partials/*.hbs', { base: src, cwd: src }).pipe(
    map((file, enc, next) => {
      handlebars.registerPartial(file.stem, file.contents.toString())
      next()
    })
  )
}

function registerHelpers (src) {
  handlebars.registerHelper('resolvePage', resolvePage)
  handlebars.registerHelper('resolvePageURL', resolvePageURL)
  return vfs.src('helpers/*.js', { base: src, cwd: src }).pipe(
    map((file, enc, next) => {
      handlebars.registerHelper(file.stem, requireFromString(file.contents.toString()))
      next()
    })
  )
}

function toPromise (stream) {
  return new Promise((resolve, reject, data = {}) =>
    stream
      .on('error', reject)
      .on('data', (chunk) => chunk.constructor === Object && Object.assign(data, chunk))
      .on('finish', () => resolve(data))
  )
}

async function previewTask (cb) {
  buildTask()
  return Promise.all([
    loadSampleUiModel(previewSrcDir),
    toPromise(
      merge(compileLayouts(srcDir),
        registerPartials(srcDir),
        registerHelpers(srcDir),
        copyImages(previewSrcDir, previewSrcDir))
    ),
  ])
    .then(([baseUiModel, { layouts }]) => {
      const extensions = ((baseUiModel.asciidoc || { }).extensions || []).map((request) => {
        ASCIIDOC_ATTRIBUTES[request.replace(/^@|\.js$/, '').replace(/[/]/g, '-') + '-loaded'] = ''
        const extension = require(request)
        extension.register.call(Asciidoctor.Extensions)
        return extension
      })
      const asciidoc = { extensions }
      for (const component of baseUiModel.site.components) {
        for (const version of component.versions || []) {
          version.asciidoc = asciidoc
        }
      }
      baseUiModel = { ...baseUiModel, env: process.env }
      delete baseUiModel.asciidoc
      return [baseUiModel, layouts]
    })
    .then(([baseUiModel, layouts]) =>
      vfs
        .src('**/*.adoc', { base: previewSrcDir, cwd: previewSrcDir })
        .pipe(
          map((file, enc, next) => {
            const siteRootPath = path.relative(ospath.dirname(file.path), ospath.resolve(previewSrcDir))
            const uiModel = { ...baseUiModel }
            uiModel.page = { ...uiModel.page }
            uiModel.siteRootPath = siteRootPath
            uiModel.siteRootUrl = path.join(siteRootPath, 'index.html')
            uiModel.uiRootPath = path.join(siteRootPath, '_')
            if (file.stem === '404') {
              uiModel.page = { layout: '404', title: 'Page Not Found' }
            } else {
              const doc = Asciidoctor.load(file.contents, { safe: 'safe', attributes: ASCIIDOC_ATTRIBUTES })
              uiModel.page.attributes = Object.entries(doc.getAttributes())
                .filter(([name, val]) => name.startsWith('page-'))
                .reduce((accum, [name, val]) => {
                  accum[name.substr(5)] = val
                  return accum
                }, { })
              uiModel.page.layout = doc.getAttribute('page-layout', 'default')
              uiModel.page.title = doc.getDocumentTitle()
              uiModel.page.contents = Buffer.from(doc.convert())
            }
            file.extname = '.html'

            try {
              file.contents = Buffer.from(layouts.get(uiModel.page.layout)(uiModel))
              next(null, file)
            } catch (e) {
              next(transformHandlebarsError(e, uiModel.page.layout))
            }
          })
        )
        .pipe(vfs.dest(previewDestDir)))
  //      .on('error', (e) => done))
  //.pipe(sink())
}

async function bundleTask (cb) {
  buildTask()
  vfs
    .src('**/*', { base: destDir, cwd: destDir })
    .pipe(zip.dest(path.join(buildDir, 'netbeans-ui-bundle.zip')))
}

module.exports = {
  build: buildTask,
  preview: previewTask,
  bundle: bundleTask,
}
