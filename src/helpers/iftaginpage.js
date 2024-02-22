'use strict'

module.exports = (page, custom) => {
  var tagarray = page.attributes.tags.split(', ')
  return tagarray.indexOf(custom) !== - 1;
}
