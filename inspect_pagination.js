const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('page_source.html', 'utf-8');
const $ = cheerio.load(html);

const pagination = $('.new-launches-pagination-container');
console.log('Pagination HTML structure:');
console.log(pagination.html());

// Find any links inside pagination
pagination.find('a, li, button').each((i, el) => {
  console.log(`Element ${i}: tag=${el.tagName}, class="${$(el).attr('class') || ''}", text="${$(el).text().trim()}", href="${$(el).attr('href') || ''}"`);
});
