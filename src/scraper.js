const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cheerio = require('cheerio');
const config = require('./config');
const logger = require('./logger');
const dedupe = require('./dedupe');
const wix = require('./wix');

/**
 * Navigates to search listing pages using the shared browser session, waits for rendering,
 * and scrolls to trigger lazy-loaded items.
 */
async function fetchRenderedHtml(browser, url) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(config.request.userAgent);

  logger.info(`Navigating to ${url}...`);
  try {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (e) {
      logger.warn(`Navigation warning for ${url}: ${e.message}`);
    }

    // Wait for potential Cloudflare turnstile challenge redirect or page rendering
    let maxWaitMs = 15000;
    let waited = 0;
    while (waited < maxWaitMs) {
      const title = await page.title();
      if (!title.toLowerCase().includes('just a moment')) {
        break;
      }
      await new Promise(r => setTimeout(r, 1500));
      waited += 1500;
    }

    // Auto-scroll to load all project cards
    const maxScrolls = 3;
    for (let i = 0; i < maxScrolls; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 1500));
    }

    return await page.content();
  } finally {
    await page.close();
  }
}

/**
 * Navigates to a specific new launch details page to parse technical metadata (Tenure, Developer, Layouts).
 * Implements a retry loop to handle transient Puppeteer navigation/rendering issues.
 */
async function fetchDetails(browser, url) {
  let attempts = 0;
  const maxAttempts = 2;
  
  while (attempts < maxAttempts) {
    attempts++;
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(config.request.userAgent);

    logger.info(`Fetching details page (attempt ${attempts}/${maxAttempts}): ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      // Wait for layouts and images to load
      await new Promise(r => setTimeout(r, 4000));
      const html = await page.content();
      
      const $ = cheerio.load(html);
      
      // Parse key-value details table
      let developer = '';
      let tenure = '';
      let totalUnits = null;
      
      $('.newlaunches-details-table-container table tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length >= 3) {
          const key = $(tds[0]).text().trim().toLowerCase();
          const val = $(tds[2]).text().trim();
          if (key.includes('developer')) {
            developer = val;
          } else if (key.includes('tenure')) {
            tenure = val;
          } else if (key.includes('total units')) {
            const cleanVal = val.replace(/[^0-9]/g, '');
            if (cleanVal) totalUnits = parseInt(cleanVal, 10);
          }
        }
      });
      
      // Parse layouts table dynamically using headers
      const tableWrapper = $('.newLaunches-availableUnits-listView-table');
      const layouts = [];
      if (tableWrapper.length > 0) {
        const table = tableWrapper.find('table');
        const headers = [];
        table.find('thead th').each((_, th) => {
          headers.push($(th).text().trim().toLowerCase());
        });
        
        const descIdx = headers.indexOf('unit description');
        const typeIdx = headers.indexOf('unit type');
        const sqftIdx = headers.findIndex(h => h.includes('sqft') || h.includes('square feet'));
        const unitsIdx = headers.findIndex(h => h.includes('no. of units') || h.includes('units count'));
        
        table.find('tbody tr').each((_, tr) => {
          const tds = $(tr).find('td');
          if (tds.length === 0) return;
          
          const cells = [];
          tds.each((_, td) => {
            cells.push($(td).text().trim());
          });
          
          const desc = descIdx !== -1 ? cells[descIdx] : '';
          const type = typeIdx !== -1 ? cells[typeIdx] : '';
          const sqft = sqftIdx !== -1 ? cells[sqftIdx] : '';
          const units = unitsIdx !== -1 ? parseInt(cells[unitsIdx].replace(/[^0-9]/g, ''), 10) || null : null;
          
          if (desc || type || sqft) {
            layouts.push({ desc, type, sqft, units });
          }
        });
      }
      
      let minBeds = null;
      let maxBeds = null;
      let minSqft = null;
      let maxSqft = null;
      
      layouts.forEach(l => {
        if (l.desc) {
          const bedMatch = l.desc.match(/(\d+)\s*Bedroom/i);
          if (bedMatch) {
            const beds = parseInt(bedMatch[1], 10);
            if (minBeds === null || beds < minBeds) minBeds = beds;
            if (maxBeds === null || beds > maxBeds) maxBeds = beds;
          }
        }
        
        if (l.sqft) {
          const sqftVal = l.sqft.replace(/,/g, '');
          const rangeMatch = sqftVal.match(/(\d+)\s*-\s*(\d+)/);
          if (rangeMatch) {
            const minS = parseFloat(rangeMatch[1]);
            const maxS = parseFloat(rangeMatch[2]);
            if (minSqft === null || minS < minSqft) minSqft = minS;
            if (maxSqft === null || maxS > maxSqft) maxSqft = maxS;
          } else {
            const val = parseFloat(sqftVal);
            if (!isNaN(val)) {
              if (minSqft === null || val < minSqft) minSqft = val;
              if (maxSqft === null || val > maxSqft) maxSqft = val;
            }
          }
        }
      });
      
      let beds = null;
      if (minBeds !== null) {
        beds = minBeds === maxBeds ? `${minBeds}` : `${minBeds} - ${maxBeds}`;
      }
      
      let floorAreaSqft = null;
      if (minSqft !== null) {
        floorAreaSqft = minSqft === maxSqft ? `${minSqft}` : `${minSqft} - ${maxSqft}`;
      }
      
      // Parse facilities
      const facilities = [];
      const facilitiesContent = $('.new-launches-facilities-content');
      if (facilitiesContent.length > 0) {
        if (facilitiesContent.find('li').length > 0) {
          facilitiesContent.find('li').each((_, li) => {
            const text = $(li).text().trim();
            if (text) facilities.push(text);
          });
        } else {
          const text = facilitiesContent.clone().find('style').remove().end().text().trim();
          if (text) {
            text.split('\n').map(line => line.trim()).filter(Boolean).forEach(line => facilities.push(line));
          }
        }
      }

      // Parse gallery images
      const detailImages = [];
      $('img').each((_, imgEl) => {
        const src = $(imgEl).attr('src');
        if (src) {
          const isGallery = src.includes('new-launches/m-max_') || 
                            $(imgEl).parent().hasClass('newlaunches-gallery-slide-image') || 
                            $(imgEl).hasClass('newlaunches-gallery-slide-image');
          if (isGallery && !detailImages.includes(src)) {
            const lowerSrc = src.toLowerCase();
            const isAd = (lowerSrc.includes('s3fs-public') && (lowerSrc.includes('.png') || lowerSrc.includes('?v='))) ||
                         lowerSrc.includes('contact-card') || 
                         lowerSrc.includes('advertisement') || 
                         lowerSrc.includes('banner');
            if (!isAd) {
              detailImages.push(src);
            }
          }
        }
      });
      
      // Parse pricing tables dynamically
      const priceRanges = [];
      $('table').each((_, tableEl) => {
        const headers = [];
        $(tableEl).find('thead th').each((_, th) => {
          headers.push($(th).text().trim().toLowerCase());
        });
        
        const bedIdx = headers.findIndex(h => h.includes('bedroom type') || h === 'type');
        const sqftIdx = headers.findIndex(h => h.includes('area range') || h.includes('size'));
        const psfIdx = headers.indexOf('average psf');
        const priceIdx = headers.findIndex(h => h.includes('price range') || h.includes('asking price'));
        
        if (bedIdx !== -1 && priceIdx !== -1) {
          $(tableEl).find('tbody tr').each((_, tr) => {
            const tds = $(tr).find('td');
            if (tds.length === 0) return;
            
            const cells = [];
            tds.each((_, td) => {
              cells.push($(td).text().trim());
            });
            
            const bedroomType = cells[bedIdx] || '';
            const sqft = sqftIdx !== -1 ? cells[sqftIdx] : '';
            const avgPsf = psfIdx !== -1 ? cells[psfIdx] : '';
            const priceRange = cells[priceIdx] || '';
            
            if (bedroomType && priceRange) {
              priceRanges.push({ bedroomType, sqft, avgPsf, priceRange });
            }
          });
        }
      });
      
      await page.close();
      return {
        developer,
        tenure,
        totalUnits,
        beds,
        floorAreaSqft,
        baths: null,
        layouts,
        facilities,
        images: detailImages,
        priceRanges
      };
    } catch (err) {
      logger.warn(`Attempt ${attempts} failed for details ${url}: ${err.message}`);
      try {
        await page.close();
      } catch (closeErr) {}
      
      if (attempts >= maxAttempts) {
        return {
          developer: '',
          tenure: '',
          totalUnits: null,
          beds: null,
          floorAreaSqft: null,
          baths: null,
          layouts: [],
          facilities: [],
          images: []
        };
      }
      // Wait before retry
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

/**
 * Parses EdgeProp Singapore New Launches project cards out of rendered HTML.
 */
function parseRecords(html) {
  const $ = cheerio.load(html);
  const records = [];
  const seenIds = new Set();

  $('.newLaunches-search-result-item-container').each((_, el) => {
    const titleEl = $(el).find('.new-launches-search-result-item-project-title-text');
    const title = titleEl.text().trim();
    if (!title) return;

    // Extract URL & slug
    let projectUrl = '';
    const anchor = titleEl.find('a');
    if (anchor.length > 0) {
      projectUrl = anchor.attr('href') || '';
    } else {
      projectUrl = $(el).find('a').attr('href') || '';
    }
    if (projectUrl && !projectUrl.startsWith('http')) {
      projectUrl = `https://www.edgeprop.sg${projectUrl}`;
    }

    let slug = '';
    if (projectUrl) {
      const parts = projectUrl.split('/').filter(Boolean);
      slug = parts[parts.length - 1] || '';
    }
    const id = slug;

    if (seenIds.has(id)) return;
    seenIds.add(id);

    // Extract District
    const addressText = $(el).find('.new-launches-search-result-item-project-address-text').text().trim();
    const districtMatch = addressText.match(/District:\s*(\d+)/i);
    const districtNum = districtMatch ? districtMatch[1] : '';
    const district = districtNum ? `D${districtNum.padStart(2, '0')}` : '';

    // Extract image from background-image style attribute
    let image = '';
    $(el).find('div').each((_, div) => {
      const style = $(div).attr('style') || '';
      if (style.includes('background-image')) {
        const match = style.match(/url\(['"]?(.*?)['"]?\)/i);
        if (match && match[1]) {
          image = match[1];
        }
      }
    });

    // Extract key-value details from search result detail labels
    let propertyType = 'Condo';
    let averagePsf = null;
    let topYear = '';
    let unitsSoldPercent = null;

    $(el).find('.search-result_detail-title').each((_, labelEl) => {
      const label = $(labelEl).text().trim().toLowerCase();
      const valEl = $(labelEl).next();
      if (valEl.length > 0) {
        const val = valEl.text().trim();
        if (label.includes('property type')) {
          if (val.toLowerCase().includes('condominium') || val.toLowerCase().includes('condo')) {
            propertyType = 'Condo';
          } else if (val.toLowerCase().includes('executive condo') || val.toLowerCase().includes('ec')) {
            propertyType = 'Executive Condo';
          } else if (val.toLowerCase().includes('apartment')) {
            propertyType = 'Apartment';
          } else if (val.toLowerCase().includes('landed')) {
            propertyType = 'Landed';
          } else {
            propertyType = val;
          }
        } else if (label.includes('average psf')) {
          const cleanVal = val.replace(/[^0-9]/g, '');
          if (cleanVal) {
            averagePsf = parseFloat(cleanVal);
          }
        } else if (label.includes('est. completion') || label.includes('completion')) {
          const yearMatch = val.match(/\b(202[4-9]|203[0-9])\b/);
          if (yearMatch) {
            topYear = yearMatch[1];
          }
        } else if (label.includes('% of units sold') || label.includes('units sold')) {
          const cleanVal = val.replace(/[^0-9.]/g, '');
          if (cleanVal) {
            unitsSoldPercent = parseFloat(cleanVal);
          }
        }
      }
    });

    records.push({
      id,
      slug,
      url: projectUrl,
      title,
      address: district ? `${district} Singapore` : 'Singapore',
      district,
      propertyType,
      beds: null,
      baths: null,
      floorAreaSqft: null,
      price: null, // edgeprop doesn't display raw price on search cards, only PSF
      psf: averagePsf,
      topYear,
      unitsSoldPercent,
      tenure: '', // we don't have it on search cards
      totalUnits: null,
      developer: '',
      agentName: '',
      agentLicense: '',
      phone: '',
      image,
      images: image ? [image] : [],
      agentPhoto: '',
      layouts: [],
      facilities: [],
      priceRanges: [],
    });
  });

  return records;
}

/**
 * Helper to build pagination URL for 99.co.
 */
function getPageUrl(baseUrl, pageNum) {
  if (pageNum === 1) return baseUrl;
  try {
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.set('page', pageNum);
    return urlObj.toString();
  } catch (e) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}page=${pageNum}`;
  }
}

/**
 * Full pipeline: render -> parse -> diff against last run -> sync to Wix.
 */
async function runOnce() {
  logger.info('Run started', { sources: config.source.baseUrls });

  const fs = require('fs');
  const path = require('path');
  const userDataDir = path.join(process.cwd(), 'data', 'browser_session');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const isHeadless = process.env.HEADLESS !== 'false';

  const launchOptions = {
    headless: isHeadless,
    userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
  };

  const macChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(macChromePath)) {
    launchOptions.executablePath = macChromePath;
  }

  let browser = await puppeteer.launch(launchOptions);

  try {
    const previous = dedupe.loadProcessed();
    const allRecords = [];
    const parsedIds = new Set();
    let anyPageFailed = false;

    for (const baseUrl of config.source.baseUrls) {
      logger.info(`Starting scrape for source: ${baseUrl}`);

      for (let pageNum = 1; pageNum <= config.source.maxPages; pageNum++) {
        const pageUrl = getPageUrl(baseUrl, pageNum);
        logger.info(`Fetching page ${pageNum}/${config.source.maxPages}: ${pageUrl}`);

        try {
          if (!browser.isConnected()) {
            logger.warn('Browser disconnected. Re-launching browser...');
            browser = await puppeteer.launch(launchOptions);
          }

          let html;
          let attempts = 0;
          const maxAttempts = 2;
          while (attempts < maxAttempts) {
            try {
              attempts++;
              html = await fetchRenderedHtml(browser, pageUrl);
              break;
            } catch (err) {
              if (attempts >= maxAttempts) throw err;
              logger.warn(`Attempt ${attempts} failed for ${pageUrl}: ${err.message}. Retrying in 3s...`);
              await new Promise(r => setTimeout(r, 3000));
            }
          }
          const records = parseRecords(html);
          logger.info(`Parsed ${records.length} new launch project(s) from page ${pageNum}`);

          if (records.length === 0) {
            logger.info(`No more listings found on page ${pageNum}. Stopping pagination for this category.`);
            break;
          }

          let newOnPage = 0;
          for (const record of records) {
            if (!parsedIds.has(record.id)) {
              parsedIds.add(record.id);

              // Check if we already parsed details previously
              const prevEntry = previous[record.id];
              let parsedPrev = null;
              if (prevEntry) {
                try {
                  parsedPrev = JSON.parse(prevEntry.data);
                } catch (e) {}
              }

              if (parsedPrev && parsedPrev.developer && parsedPrev.layouts !== undefined && parsedPrev.priceRanges !== undefined) {
                record.developer = parsedPrev.developer;
                record.tenure = parsedPrev.tenure;
                record.totalUnits = parsedPrev.totalUnits;
                record.beds = parsedPrev.beds;
                record.floorAreaSqft = parsedPrev.floorAreaSqft;
                record.baths = parsedPrev.baths;
                record.layouts = parsedPrev.layouts || [];
                record.facilities = parsedPrev.facilities || [];
                record.images = parsedPrev.images || record.images;
                record.priceRanges = parsedPrev.priceRanges || [];
                logger.info(`Reused details from cache for: ${record.title}`);
              } else {
                if (!browser.isConnected()) {
                  logger.warn('Browser disconnected before details fetch. Re-launching browser...');
                  browser = await puppeteer.launch(launchOptions);
                }

                // Add a small delay between details requests
                await new Promise(r => setTimeout(r, 1200));
                const details = await fetchDetails(browser, record.url);
                record.developer = details.developer;
                record.tenure = details.tenure;
                record.totalUnits = details.totalUnits;
                record.beds = details.beds;
                record.floorAreaSqft = details.floorAreaSqft;
                record.baths = details.baths;
                record.layouts = details.layouts || [];
                record.facilities = details.facilities || [];
                record.priceRanges = details.priceRanges || [];
                if (details.images && details.images.length > 0) {
                  record.images = details.images;
                }
              }

              allRecords.push(record);
              newOnPage++;
            }
          }

          if (newOnPage === 0) {
            logger.info(`No new listings found on page ${pageNum} (all listings already scraped). Stopping pagination.`);
            break;
          }

          const isLastPage = pageNum === config.source.maxPages;
          const isLastUrl = config.source.baseUrls.indexOf(baseUrl) === config.source.baseUrls.length - 1;
          if (!isLastPage || !isLastUrl) {
            const delay = config.request.delayBetweenPagesMs;
            logger.info(`Waiting ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
          }
        } catch (err) {
          logger.error(`Failed to process page ${pageNum} of ${baseUrl}`, { error: err.message });
          anyPageFailed = true;
          break;
        }
      }
    }

    logger.info(`Total aggregated new launch projects: ${allRecords.length}`);

    if (allRecords.length === 0) {
      logger.warn('No listings parsed across all URLs — site structure or Cloudflare challenge check needed');
      return { success: false, reason: 'no_records_parsed' };
    }

    const recordsById = {};
    for (const r of allRecords) recordsById[r.id] = r;

    const { newIds, changedIds, unchangedIds, missingIds } = dedupe.diff(recordsById, anyPageFailed);

    const results = { newCount: 0, updatedCount: 0, delistedCount: 0, failed: 0 };
    const failedIds = new Set();

    if (config.wix.enabled) {
      for (const id of [...newIds, ...changedIds]) {
        try {
          await wix.upsertProperty(recordsById[id]);
          results[newIds.includes(id) ? 'newCount' : 'updatedCount']++;
        } catch (err) {
          results.failed++;
          failedIds.add(id);
          logger.error('Failed to upsert property to Wix', {
            id,
            error: err.response?.data || err.message,
          });
        }
      }

      for (const id of missingIds) {
        try {
          await wix.markDelisted(id);
          results.delistedCount++;
        } catch (err) {
          results.failed++;
          failedIds.add(id);
          logger.error('Failed to mark property delisted in Wix', {
            id,
            error: err.response?.data || err.message,
          });
        }
      }
    } else {
      results.newCount = newIds.length;
      results.updatedCount = changedIds.length;
      results.delistedCount = missingIds.length;
      logger.info('Wix sync is disabled; listings stored locally only.');
    }

    // Save final state, excluding failed syncs so they get retried next time
    dedupe.save(recordsById, failedIds, anyPageFailed);

    logger.info('Run finished', {
      ...results,
      unchanged: unchangedIds.length,
      totalParsed: allRecords.length,
      anyPageFailed,
    });

    return { success: true, results };
  } finally {
    try {
      await browser.close();
    } catch (closeErr) {}
  }
}

module.exports = { runOnce, parseRecords };
