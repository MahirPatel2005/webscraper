const mongoose = require('mongoose');
const config = require('./config');

const MONGODB_URI = config.mongoUri;

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    cachedConnection = conn;
    console.log(`[MongoDB] Connected successfully to database: "${mongoose.connection.name}"`);
    return conn;
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    throw err;
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from database.');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Runtime error:', err.message);
});

// Listing Schema definition
const ListingSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    district: {
      type: String,
      default: ''
    },
    propertyType: {
      type: String,
      default: 'Condo'
    },
    beds: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    baths: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    floorAreaSqft: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    price: {
      type: Number,
      default: null
    },
    psf: {
      type: Number,
      default: null
    },
    topYear: {
      type: mongoose.Schema.Types.Mixed,
      default: ''
    },
    unitsSoldPercent: {
      type: Number,
      default: null
    },
    tenure: {
      type: String,
      default: '99 years'
    },
    totalUnits: {
      type: Number,
      default: null
    },
    developer: {
      type: String,
      default: ''
    },
    agentName: {
      type: String,
      default: ''
    },
    agentLicense: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: ''
    },
    images: {
      type: [String],
      default: []
    },
    agentPhoto: {
      type: String,
      default: ''
    },
    layouts: {
      type: Array,
      default: []
    },
    facilities: {
      type: [String],
      default: []
    },
    priceRanges: {
      type: Array,
      default: []
    },
    history: {
      type: Array,
      default: []
    },
    status: {
      type: String,
      default: 'active'
    },
    lastSeen: {
      type: mongoose.Schema.Types.Mixed,
      default: () => new Date().toISOString()
    },
    delistedAt: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    disabled: {
      type: Boolean,
      default: false
    },
    featured: {
      type: Boolean,
      default: false
    },
    custom: {
      type: Boolean,
      default: false
    },
    overrides: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'listings',
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret.slug || (ret._id ? ret._id.toString() : '');
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret.slug || (ret._id ? ret._id.toString() : '');
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Virtual id field
ListingSchema.virtual('id').get(function () {
  return this.slug || (this._id ? this._id.toString() : '');
});

const Listing = mongoose.models.Listing || mongoose.model('Listing', ListingSchema);

module.exports = {
  connectDB,
  Listing,
  mongoose
};
