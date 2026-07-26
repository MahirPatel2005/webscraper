import React, { useState } from 'react';
import InquiryModal from './InquiryModal';
import { formatDistrict, getLaunchStatus } from './ListingsGrid';

// Keyword to icon mapping for facilities to look extra premium
const getFacilityIcon = (facilityName) => {
  const name = facilityName.toLowerCase();
  if (name.includes('pool') || name.includes('lap') || name.includes('aqua') || name.includes('spa') || name.includes('wet') || name.includes('bubble')) {
    return 'fa-solid fa-swimming-pool';
  }
  if (name.includes('gym') || name.includes('fitness') || name.includes('cardio') || name.includes('jogging')) {
    return 'fa-solid fa-dumbbell';
  }
  if (name.includes('tennis') || name.includes('court') || name.includes('paddle')) {
    return 'fa-solid fa-ruler-combined';
  }
  if (name.includes('garden') || name.includes('lawn') || name.includes('green') || name.includes('park') || name.includes('forest') || name.includes('trail') || name.includes('tree')) {
    return 'fa-solid fa-leaf';
  }
  if (name.includes('play') || name.includes('kid') || name.includes('toddler') || name.includes('children')) {
    return 'fa-solid fa-child';
  }
  if (name.includes('lounge') || name.includes('clubhouse') || name.includes(' pavilion') || name.includes('dining') || name.includes('bbq') || name.includes('deck') || name.includes('room') || name.includes('suite') || name.includes('meeting')) {
    return 'fa-solid fa-couch';
  }
  if (name.includes('arrival') || name.includes('lobby') || name.includes('court') || name.includes('gate') || name.includes('foyer')) {
    return 'fa-solid fa-door-open';
  }
  if (name.includes('steam') || name.includes('shower') || name.includes('toilet') || name.includes('changing') || name.includes('sauna') || name.includes('onsen')) {
    return 'fa-solid fa-bath';
  }
  return 'fa-solid fa-circle-check';
};

export default function DetailView({ id, listings, onBack }) {
  // Tabs state (Details, Unit Distribution, Facilities, Amenities)
  // News, Calculator, and Available Units are intentionally excluded!
  const [activeTab, setActiveTab] = useState('details');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showMobile, setShowMobile] = useState(false);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);

  const item = listings.find(l => l.id === id);

  if (!item) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '16px' }}></i>
        <h2>Property Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>The selected property launch could not be found.</p>
        <button onClick={onBack} className="btn-view" style={{ marginTop: '24px' }}>
          Back to Listings
        </button>
      </div>
    );
  }

  const imagesList = item.images && item.images.length > 0 ? item.images : [item.image || 'https://sg.tepcdn.com/public/usr/8b7q6c/026af5-shutterstock-178043579.jpg'];

  const nextSlide = () => {
    setCurrentSlide(prev => (prev === imagesList.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? imagesList.length - 1 : prev - 1));
  };

  const launchStatus = getLaunchStatus(item);

  // Generate some high-quality mock amenities if none are scraped
  const defaultAmenities = [
    `Approx 500m to nearest MRT station (${item.district || 'D11'} area)`,
    'Within 1km of highly-rated primary schools',
    'Close proximity to local food centres & daily dining spots',
    'Short driving distance to major expressways (CTE/PIE/AYE)',
    'Minutes away from popular retail malls and grocery outlets'
  ];

  const amenitiesList = item.amenities && item.amenities.length > 0 ? item.amenities : defaultAmenities;

  return (
    <>
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <span className="link" onClick={onBack}>Home</span>
        <span className="separator">&gt;</span>
        <span className="link" onClick={onBack}>New Launches</span>
        <span className="separator">&gt;</span>
        <span>{item.title}</span>
      </div>

      {/* Main Info Header */}
      <div className="detail-main-info">
        <div className="detail-title-block">
          <h1 style={{ display: 'inline-block', verticalAlign: 'middle' }}>{item.title}</h1>
          <span className={`status-badge ${launchStatus.toLowerCase()}`}>
            {launchStatus}
          </span>
        </div>
        <button className="btn-share" onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied to clipboard!'))}>
          <i className="fa-solid fa-arrow-up-from-bracket"></i> Share
        </button>
      </div>

      {/* Layout details structure (Left Content, Right Widget) */}
      <div className="detail-layout">
        
        {/* Left Column: Media & Tabs */}
        <div>
          {/* Gallery Carousel */}
          <div className="media-container">
            <div className="carousel-viewport">
              <div
                className="carousel-slides"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {imagesList.map((img, idx) => (
                  <div key={idx} className="carousel-slide">
                    <img src={img} alt={`${item.title} slide ${idx + 1}`} />
                  </div>
                ))}
              </div>
            </div>

            {imagesList.length > 1 && (
              <>
                <button className="carousel-btn prev" onClick={prevSlide}>
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <button className="carousel-btn next" onClick={nextSlide}>
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </>
            )}

            {/* Slider overlays */}
            <div className="carousel-overlay">
              <button className="overlay-tab active">
                <i className="fa-solid fa-image"></i> Images ({imagesList.length})
              </button>
              <button className="overlay-tab" onClick={() => alert('Virtual 360 tour coming soon!')}>
                <i className="fa-solid fa-street-view"></i> 360 View
              </button>
              <button className="overlay-tab" onClick={() => setActiveTab('layouts')}>
                <i className="fa-solid fa-cubes"></i> Floor Plans ({item.layouts?.length || 0})
              </button>
            </div>
          </div>

          {/* Section Tabs Header */}
          <div className="tabs-header">
            <button
              className={`tab-link ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`tab-link ${activeTab === 'layouts' ? 'active' : ''}`}
              onClick={() => setActiveTab('layouts')}
            >
              Unit Distribution
            </button>
            <button
              className={`tab-link ${activeTab === 'facilities' ? 'active' : ''}`}
              onClick={() => setActiveTab('facilities')}
            >
              Facilities
            </button>
            <button
              className={`tab-link ${activeTab === 'amenities' ? 'active' : ''}`}
              onClick={() => setActiveTab('amenities')}
            >
              Amenities
            </button>
          </div>

          {/* Tab Content Panels */}
          
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="tab-content active">
              {/* Overview text */}
              <div className="overview-section">
                <h2>Overview</h2>
                {item.tagline && <div className="overview-tagline">{item.tagline}</div>}
                {item.description ? (
                  <div
                    className="overview-text"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                ) : (
                  <div className="overview-text">
                    <p>
                      {item.title} is a premium {item.propertyType || 'residential'} development located in the desirable {formatDistrict(item.district)} area. Developed by {item.developer || 'reputable developers'}, it offers excellent access to local transit, dining options, and lifestyle hubs.
                    </p>
                    <p>
                      Featuring flexible layout distributions ranging from {item.beds || 'various'} bedroom configurations, the project stands out as a flagship new launch for home buyers and property investors alike.
                    </p>
                  </div>
                )}
              </div>

              {/* Technical Specifications Grid */}
              <div className="specs-section">
                <h2>Technical Specifications</h2>
                <div className="specs-grid">
                  <div className="spec-detail-card">
                    <span className="label">Property Type</span>
                    <span className="val">{item.propertyType || '-'}</span>
                  </div>
                  <div className="spec-detail-card">
                    <span className="label">District</span>
                    <span className="val">{formatDistrict(item.district)}</span>
                  </div>
                  <div className="spec-detail-card">
                    <span className="label">Est. Completion</span>
                    <span className="val">{item.topYear || '-'}</span>
                  </div>
                  <div className="spec-detail-card">
                    <span className="label">Average PSF</span>
                    <span className="val">{item.psf ? `$${item.psf}` : '-'}</span>
                  </div>
                  <div className="spec-detail-card">
                    <span className="label">% of units sold</span>
                    <span className="val">{item.unitsSoldPercent !== null && item.unitsSoldPercent !== undefined ? `${item.unitsSoldPercent}%` : '-'}</span>
                  </div>
                  <div className="spec-detail-card">
                    <span className="label">Tenure</span>
                    <span className="val">{item.tenure || '-'}</span>
                  </div>
                  <div className="spec-detail-card">
                    <span className="label">Total Units</span>
                    <span className="val">{item.totalUnits || '-'}</span>
                  </div>
                  <div className="spec-detail-card">
                    <span className="label">Developer</span>
                    <span className="val">{item.developer || '-'}</span>
                  </div>
                  <div className="spec-detail-card" style={{ gridColumn: 'span 2' }}>
                    <span className="label">Address</span>
                    <span className="val">{item.address || 'Singapore'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UNIT DISTRIBUTION / LAYOUTS */}
          {activeTab === 'layouts' && (
            <div className="tab-content active">
              {item.layouts && item.layouts.length > 0 ? (
                <div className="distribution-table-container">
                  <table className="distribution-table">
                    <thead>
                      <tr>
                        <th>Unit Description</th>
                        <th>Unit Type</th>
                        <th>Area (Sqft)</th>
                        <th>No. of Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.layouts.map((l, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '600' }}>{l.desc || '-'}</td>
                          <td><code>{l.type || '-'}</code></td>
                          <td>{l.sqft || '-'}</td>
                          <td>{l.units || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-table-list" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
                  <p>No layout distribution details are currently available for this property.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FACILITIES */}
          {activeTab === 'facilities' && (
            <div className="tab-content active">
              {item.facilities && item.facilities.length > 0 ? (
                <div className="items-list-grid">
                  {item.facilities.map((fac, idx) => (
                    <div key={idx} className="item-list-card">
                      <i className={getFacilityIcon(fac)}></i>
                      <span>{fac}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-circle-nodes" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
                  <p>No project facilities are listed for this development.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AMENITIES */}
          {activeTab === 'amenities' && (
            <div className="tab-content active">
              <div className="items-list-grid">
                {amenitiesList.map((amen, idx) => (
                  <div key={idx} className="item-list-card">
                    <i className="fa-solid fa-map-pin"></i>
                    <span>{amen}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Contact Sidebar Widget */}
        {/* <div>
          <aside className="sidebar-widget">
            <div className="sidebar-developer-logo">
              <div className="dev-text-logo">
                <i className="fa-solid fa-hard-hat" style={{ color: 'var(--primary)' }}></i> Dev<span>Launch</span>
              </div>
              <div className="dev-subtext">Developer</div>
              <div className="sidebar-dev-name" title={item.developer || 'Phoenix Dunearn Pte Ltd'}>
                {item.developer || 'Independent Joint Developers'}
              </div>
            </div>

            <div className="sidebar-actions">
              <button
                className="btn-sidebar solid"
                onClick={() => setIsInquiryOpen(true)}
              >
                Enquire Now
              </button>
              
              <button
                className="btn-sidebar outline"
                onClick={() => setShowMobile(!showMobile)}
              >
                {showMobile ? '+65 9838 2818' : 'Show Mobile'}
              </button>
            </div>
          </aside>
        </div> */}
      </div>

      {/* Inquiry Lead Capture Modal */}
      <InquiryModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        propertyName={item.title}
      />
    </>
  );
}
