module.exports = (tag, { data }) => {
  const { contentCatalog, site } = data.root
  const pages = contentCatalog.getPages(({ asciidoc, out }) => {
    if (! out || ! asciidoc)
      return
    const pageTags = asciidoc.attributes['page-tags']
    const rvalue = pageTags && pageTags.split(', ').includes(tag)
    return rvalue
  })
  const { buildPageUiModel } = require.main.require('@antora/page-composer/build-ui-model')
  return pages.map((page) => buildPageUiModel(site, page, contentCatalog)).
    sort(sortByDate)
}

function sortByDate (a, b) {
  return new Date(b.attributes.revdate) - new Date(a.attributes.revdate)
}

