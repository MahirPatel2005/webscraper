import React, { useState } from 'react';
import InquiryModal from './InquiryModal';
import { formatDistrict, getLaunchStatus, getMetroColor, getMetroLines, getMetroAbbr } from './ListingsGrid';
import { getCleanImages } from '../App';

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

export function cleanFacilities(arr) {
  if (!Array.isArray(arr)) return [];
  const cleaned = [];
  let i = 0;
  while (i < arr.length) {
    let item = arr[i].trim();
    if (!item) {
      i++;
      continue;
    }
    
    const isNumber = /^\d+$/.test(item);
    const isRoman = /^[ivx]+$/i.test(item);
    const isOrdinal = /^\d+(st|nd|rd|th)$/i.test(item);
    
    if (isOrdinal && i + 1 < arr.length && arr[i + 1].trim().toLowerCase() === 'storey:') {
      cleaned.push(`${item} Storey`);
      i += 2;
      continue;
    }

    if ((isNumber || isRoman) && i + 1 < arr.length) {
      const nextItem = arr[i + 1].trim();
      cleaned.push(`${item}. ${nextItem}`);
      i += 2;
      continue;
    }

    const startsWithNum = /^\d+/.test(item);
    if (startsWithNum && i + 1 < arr.length) {
      const nextItem = arr[i + 1].trim();
      const isNextDescriptive = /^(pool|deck|lap pool|lawn|seat|foyer|living|dining|patio|club|lounge|room|pods|servery|toilet|pavilion)/i.test(nextItem);
      if (isNextDescriptive) {
        cleaned.push(`${item} ${nextItem}`);
        i += 2;
        continue;
      }
    }

    cleaned.push(item);
    i++;
  }

  return cleaned
    .map(x => x.replace(/\s+/g, ' ').trim())
    .filter(x => {
      if (/^\d+$/.test(x)) return false;
      if (/^[ivx]$/i.test(x)) return false;
      if (x.length <= 1) return false;
      return true;
    });
}

export default function DetailView({ id, listings, onBack, onSelectProperty }) {
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

  const imagesList = getCleanImages(item);
  if (imagesList.length === 0) {
    imagesList.push(item.image || 'https://sg.tepcdn.com/public/usr/8b7q6c/026af5-shutterstock-178043579.jpg');
  }

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

  // Calculate up to 4 similar properties
  const similarProperties = listings
    .filter(l => l.id !== item.id)
    .map(l => {
      let score = 0;
      if (l.district === item.district) score += 5;
      if (l.propertyType === item.propertyType) score += 3;
      if (l.developer && item.developer && l.developer.toLowerCase() === item.developer.toLowerCase()) score += 2;
      return { item: l, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(x => x.item);

  return (
    <>
      {/* Prominent Back Button */}
      <button onClick={onBack} className="btn-back">
        <i className="fa-solid fa-arrow-left"></i> Back to Listings
      </button>

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
          <div>
            <h1 style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '12px' }}>{item.title}</h1>
            {launchStatus !== 'Launched' && (
              <span className={`status-badge ${launchStatus.toLowerCase()}`} style={{ verticalAlign: 'middle' }}>
                {launchStatus === 'Launching' ? 'Launching Soon' : launchStatus}
              </span>
            )}
          </div>
          {/* Metro Line Badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            {getMetroLines(item.district).map(line => (
              <span key={line} className="metro-badge-container">
                <span className="metro-badge-logo" style={{ backgroundColor: getMetroColor(line) }}>
                  {getMetroAbbr(line)}
                </span>
                <span className="metro-badge-text">{line}</span>
              </span>
            ))}
          </div>
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

              {/* Prices by Unit Type Section */}
              {item.priceRanges && item.priceRanges.length > 0 && (
                <div className="prices-by-type-section" style={{ marginTop: '30px' }}>
                  <h2 style={{ marginBottom: '14px' }}>Prices by Unit Type (avail)</h2>
                  <div className="distribution-table-container">
                    <table className="distribution-table">
                      <thead>
                        <tr>
                          <th>Bedroom Type</th>
                          <th>Area Range (Sqft)</th>
                          <th>Average PSF</th>
                          <th>Price Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.priceRanges.map((pr, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: '600' }}>{pr.bedroomType || '-'}</td>
                            <td>{pr.sqft || '-'}</td>
                            <td>{pr.avgPsf || '-'}</td>
                            <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{pr.priceRange || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UNIT DISTRIBUTION / LAYOUTS */}
          {activeTab === 'layouts' && (
            <div className="tab-content active">
              {/* Prices by Unit Type Section */}
              {item.priceRanges && item.priceRanges.length > 0 && (
                <div className="prices-by-type-section" style={{ marginBottom: '30px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy-dark)', marginBottom: '14px', fontFamily: 'Poppins, sans-serif' }}>
                    <i className="fa-solid fa-tags" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>
                    Prices by Unit Type (avail)
                  </h3>
                  <div className="distribution-table-container">
                    <table className="distribution-table">
                      <thead>
                        <tr>
                          <th>Bedroom Type</th>
                          <th>Area Range (Sqft)</th>
                          <th>Average PSF</th>
                          <th>Price Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.priceRanges.map((pr, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: '600' }}>{pr.bedroomType || '-'}</td>
                            <td>{pr.sqft || '-'}</td>
                            <td>{pr.avgPsf || '-'}</td>
                            <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{pr.priceRange || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Layout Distribution Details Section */}
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy-dark)', marginBottom: '14px', fontFamily: 'Poppins, sans-serif', marginTop: item.priceRanges?.length > 0 ? '30px' : '0' }}>
                <i className="fa-solid fa-cubes" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>
                Unit Distribution Details
              </h3>

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
                <div className="facilities-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cleanFacilities(item.facilities).map((fac, idx) => {
                    const isHeader = fac.toLowerCase().includes('storey') || fac.toLowerCase().includes('level') || fac.toLowerCase().includes('roof') || fac.toLowerCase().includes('basement');
                    if (isHeader) {
                      return (
                        <h3 key={idx} style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          color: 'var(--primary)',
                          borderBottom: '2px solid var(--border-color)',
                          paddingBottom: '6px',
                          marginTop: idx > 0 ? '20px' : '0',
                          fontFamily: 'Poppins, sans-serif'
                        }}>
                          <i className="fa-solid fa-layer-group" style={{ marginRight: '8px' }}></i>
                          {fac}
                        </h3>
                      );
                    }
                    return (
                      <div key={idx} className="facility-item-line" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: '14px',
                        color: 'var(--text-main)'
                      }}>
                        <i className={getFacilityIcon(fac)} style={{ color: 'var(--primary)', width: '16px', textAlign: 'center' }}></i>
                        <span>{fac}</span>
                      </div>
                    );
                  })}
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
              <div className="facilities-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {amenitiesList.map((amen, idx) => (
                  <div key={idx} className="facility-item-line" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '14px',
                    color: 'var(--text-main)'
                  }}>
                    <i className="fa-solid fa-map-pin" style={{ color: 'var(--primary)', width: '16px', textAlign: 'center' }}></i>
                    <span>{amen}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Contact Sidebar Widget */}
        <div>
          <aside className="sidebar-widget she-sidebar" style={{ textAlign: 'center' }}>
            <div className="sidebar-agent-profile" style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
              <div className="agent-avatar-container" style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="agent-avatar-gradient" style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary) 0%, #1e293b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '36px',
                  fontWeight: '700',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
                }}>
                  E
                </div>
                <span className="online-badge" style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '14px',
                  height: '14px',
                  backgroundColor: '#22c55e',
                  border: '2px solid #ffffff',
                  borderRadius: '50%'
                }}></span>
              </div>
              <h3 className="agent-name" style={{ fontSize: '20px', fontWeight: '700', color: 'var(--navy-dark)', margin: '0 0 4px', fontFamily: 'Poppins, sans-serif' }}>Elaine</h3>
              <div className="agent-agency" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SHE Real Estate</div>
              <div className="agent-tagline" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Founder & Property Expert</div>
              
              <div className="agent-badge" style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                fontSize: '11px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '99px',
                marginTop: '12px'
              }}>
                <i className="fa-solid fa-shield-halved" style={{ color: 'var(--primary)', marginRight: '6px' }}></i>
                Direct Developer Pricing
              </div>
            </div>

            <div className="sidebar-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <a
                href={`https://wa.me/6598382818?text=${encodeURIComponent(`Hi Elaine, I'm interested in ${item.title}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sidebar btn-wa"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '14px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 211, 102, 0.2)'
                }}
              >
                <i className="fa-brands fa-whatsapp" style={{ fontSize: '18px' }}></i>
                WhatsApp Elaine
              </a>

              <a
                href={`mailto:elaine@sherealestate.com.sg?subject=${encodeURIComponent(`Inquiry on ${item.title}`)}&body=${encodeURIComponent(`Hi Elaine, I'm interested in ${item.title}. Please send me more details. Thanks!`)}`}
                className="btn-sidebar btn-email"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '14px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.1)'
                }}
              >
                <i className="fa-regular fa-envelope" style={{ fontSize: '16px' }}></i>
                Email Elaine
              </a>

              <a
                href="tel:+6598382818"
                className="btn-sidebar btn-call"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontWeight: '600',
                  fontSize: '14px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  border: '1px solid #cbd5e1',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-phone" style={{ fontSize: '14px' }}></i>
                Call Elaine
              </a>
            </div>
          </aside>
        </div>
      </div>

      {/* Similar Properties Section */}
      {similarProperties.length > 0 && (
        <section className="similar-properties-section">
          <h2 className="similar-properties-title">Similar Properties</h2>
          <div className="listings-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', marginBottom: '0' }}>
            {similarProperties.map(simItem => {
              const simStatus = getLaunchStatus(simItem);
              const simCleanImages = getCleanImages(simItem);
              const simCover = simCleanImages[0] || 'https://sg.tepcdn.com/public/usr/8b7q6c/026af5-shutterstock-178043579.jpg';
              
              return (
                <article
                  key={simItem.id}
                  className="property-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectProperty(simItem.id)}
                >
                  {simStatus !== 'Launched' && (
                    <span className={`status-badge ${simStatus.toLowerCase()}`}>
                      {simStatus === 'Launching' ? 'Launching Soon' : simStatus}
                    </span>
                  )}
                  <div className="card-img-wrapper" style={{ paddingTop: '65%' }}>
                    <img src={simCover} alt={simItem.title} className="card-img" />
                  </div>
                  <div className="card-content" style={{ padding: '16px' }}>
                    <h3 className="card-title" style={{ fontSize: '15px', marginBottom: '4px' }}>{simItem.title}</h3>
                    <div className="card-district" style={{ fontSize: '12px', marginBottom: '8px' }}>
                      District: {formatDistrict(simItem.district)}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {getMetroLines(simItem.district).slice(0, 1).map(line => (
                        <span key={line} className="metro-badge-container" style={{ padding: '2px 6px 2px 3px' }}>
                          <span className="metro-badge-logo" style={{ backgroundColor: getMetroColor(line), width: '28px', height: '16px', borderRadius: '8px', fontSize: '8px' }}>
                            {getMetroAbbr(line)}
                          </span>
                          <span className="metro-badge-text" style={{ fontSize: '10px' }}>{line}</span>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', color: 'var(--text-muted)' }}>
                      <span>{simItem.propertyType}</span>
                      <span style={{ fontWeight: '600', color: 'var(--navy-dark)' }}>
                        {simItem.psf ? `$${simItem.psf} PSF` : '-'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Inquiry Lead Capture Modal */}
      <InquiryModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        propertyName={item.title}
      />
    </>
  );
}
