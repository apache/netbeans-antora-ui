'use strict'

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
  const sortedpages = pages.map((page) => buildPageUiModel(site, page, contentCatalog)).
    sort(sortByDate)
  const resultList = []
  for (let i = 0; i < sortedpages.length; i++) {
    const page = sortedpages[i]
    resultList.push(getSelectedAttributes(page))
  }
  return resultList
}

function getSelectedAttributes (page) {
  const contents = page.contents.toString()
  // filter what we need
  // this is overkill but needed for live site.
  return {
    filtredrevdate: page.attributes.revdate,
    filtredcontent: blogcontent(contents),
    title: page.title,
    url: page.url,
  }
}

function sortByDate (a, b) {
  return new Date(b.attributes.revdate) - new Date(a.attributes.revdate)
}

function blogcontent (s) {
  // end of content
  const endofsection  = s.indexOf("<section class='tools'>")
  const endofarticle = s.indexOf("</article>")
  // possible starting point of article,
  const startofparagraph = s.indexOf('<div class="paragraph">')
  const startofpreamble = s.indexOf('<div id="preamble">')
  // take min if defined
  const startpoint = Math.min( startofparagraph>-1 ? startofparagraph : Infinity, startofpreamble >-1 ? startofpreamble: Infinity)
  const endpoint = Math.min( endofsection>-1 ? endofsection : Infinity, endofarticle >-1 ? endofarticle: Infinity)
  const split = s.substring( startpoint, endpoint)
  // hack for image
  const imagerewrite = split.replaceAll('"../../../_images','"../_images')
  //
  return imagerewrite
}

