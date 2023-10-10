module.exports = (tag, custom, { data }) => {
  const { contentCatalog, site } = data.root
  const pages = contentCatalog.getPages(({ asciidoc, out }) => {
    if (! out || ! asciidoc)
      return
    const pageTags = asciidoc.attributes['page-tags']
    const pagewikiSection = asciidoc.attributes['page-wikidevsection']
    const rvalue = pageTags && pageTags.split(', ').includes(tag) && pagewikiSection && pagewikiSection.split(', ').includes(custom)
    return rvalue
  })
  const { buildPageUiModel } = require.main.require('@antora/page-composer/build-ui-model')
  return pages.map((page) => buildPageUiModel(site, page, contentCatalog)).sort(
    (a, b) => (getPosition(a, custom) - getPosition(b, custom)))
}

function getPosition (page, custom) {
  const val = page.attributes.wikidevsection.split(', ')
  const index = val.indexOf(custom)
  const valpos = page.attributes.position.split(', ')
  const r = valpos[index]
  return Number(r)
}

