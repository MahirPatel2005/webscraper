const fs = require('fs');
const path = require('path');
const { connectDB, Listing, mongoose } = require('./db');
const config = require('./config');

async function migrate() {
  console.log('[Migration] Connecting to MongoDB...');
  await connectDB();

  const existingCount = await Listing.countDocuments();
  console.log(`[Migration] Current documents in MongoDB listings collection: ${existingCount}`);

  const listingsPath = config.paths.listingsFile;
  if (!fs.existsSync(listingsPath)) {
    console.error(`[Migration] listings.json not found at ${listingsPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(listingsPath, 'utf-8');
  const listings = JSON.parse(raw || '[]');
  console.log(`[Migration] Found ${listings.length} listings in ${listingsPath}`);

  let inserted = 0;
  let updated = 0;

  for (const item of listings) {
    const slug = item.slug || item.id;
    if (!slug) continue;

    // Check if listing already exists
    const existing = await Listing.findOne({ slug });

    const docData = {
      slug,
      title: item.title,
      url: item.url || '',
      address: item.address || '',
      district: item.district || '',
      propertyType: item.propertyType || 'Condo',
      beds: item.beds !== undefined ? item.beds : null,
      baths: item.baths !== undefined ? item.baths : null,
      floorAreaSqft: item.floorAreaSqft !== undefined ? item.floorAreaSqft : null,
      price: item.price !== undefined ? item.price : null,
      psf: item.psf !== undefined ? item.psf : null,
      topYear: item.topYear !== undefined ? item.topYear : '',
      unitsSoldPercent: item.unitsSoldPercent !== undefined ? item.unitsSoldPercent : null,
      tenure: item.tenure || '99 years',
      totalUnits: item.totalUnits !== undefined ? item.totalUnits : null,
      developer: item.developer || '',
      agentName: item.agentName || '',
      agentLicense: item.agentLicense || '',
      phone: item.phone || '',
      image: item.image || '',
      images: Array.isArray(item.images) ? item.images : [],
      agentPhoto: item.agentPhoto || '',
      layouts: Array.isArray(item.layouts) ? item.layouts : [],
      facilities: Array.isArray(item.facilities) ? item.facilities : [],
      priceRanges: Array.isArray(item.priceRanges) ? item.priceRanges : [],
      history: Array.isArray(item.history) ? item.history : [],
      status: item.status || 'active',
      lastSeen: item.lastSeen || new Date().toISOString(),
      delistedAt: item.delistedAt || null,
      disabled: item.disabled === true,
      featured: item.featured === true,
      custom: item.custom === true,
      overrides: item.overrides || {}
    };

    if (existing) {
      // If it exists in MongoDB, preserve existing MongoDB disabled/featured flags if set there
      const updatePayload = {
        ...docData,
        disabled: existing.disabled !== undefined ? existing.disabled : docData.disabled,
        featured: existing.featured !== undefined ? existing.featured : docData.featured,
        custom: existing.custom !== undefined ? existing.custom : docData.custom,
      };
      await Listing.updateOne({ _id: existing._id }, { $set: updatePayload });
      updated++;
    } else {
      await Listing.create(docData);
      inserted++;
    }
  }

  const finalCount = await Listing.countDocuments();
  console.log(`[Migration] Migration complete!`);
  console.log(`  - Inserted: ${inserted}`);
  console.log(`  - Updated: ${updated}`);
  console.log(`  - Total in MongoDB: ${finalCount}`);

  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
