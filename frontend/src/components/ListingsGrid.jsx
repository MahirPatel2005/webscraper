import React from 'react';
import { districtToMetroLines, getCleanImages } from '../App';

export const getMetroColor = (line) => {
  const name = line.toLowerCase();
  if (name.includes('north south')) return '#d02c2f';
  if (name.includes('east west')) return '#00953a';
  if (name.includes('north east')) return '#742c8e';
  if (name.includes('circle')) return '#f99f1b';
  if (name.includes('downtown')) return '#005ec4';
  if (name.includes('thomson-east coast') || name.includes('thomson east')) return '#9d5b25';
  return '#64748b'; // default slate grey
};

export const getMetroLines = (districtCode) => {
  return districtToMetroLines[districtCode] || [];
};

const districtMapping = {
  'D01': 'Raffles Place, Cecil, Marina, People\'s Park',
  'D02': 'Anson, Tanjong Pagar, Chinatown',
  'D03': 'Queenstown, Tiong Bahru, Alexandria',
  'D04': 'Telok Blangah, Harbourfront, Sentosa',
  'D05': 'Pasir Panjang, Hong Leong Garden, Clementi New Town',
  'D06': 'High Street, Beach Road (part)',
  'D07': 'Middle Road, Golden Mile',
  'D08': 'Little India, Farrer Park',
  'D09': 'Orchard, Cairnhill, River Valley',
  'D10': 'Ardmore, Bukit Timah, Holland Road, Tanglin',
  'D11': 'Watten Estate, Novena, Thomson',
  'D12': 'Balestier, Toa Payoh, Serangoon',
  'D13': 'Macpherson, Braddell',
  'D14': 'Geylang, Eunos, Paya Lebar, Sims',
  'D15': 'Katong, Joo Chiat, Amber Road, Meyer Road, Marine Parade',
  'D16': 'Bedok, Upper East Coast, Eastwood, Kew Drive',
  'D17': 'Loyang, Changi',
  'D18': 'Tampines, Pasir Ris',
  'D19': 'Serangoon Garden, Hougang, Ponggol',
  'D20': 'Bishan, Ang Mo Kio',
  'D21': 'Upper Bukit Timah, Clementi Park, Ulu Pandan',
  'D22': 'Jurong',
  'D23': 'Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang',
  'D24': 'Lim Chu Kang, Tengah',
  'D25': 'Kranji, Woodgrove, Woodlands',
  'D26': 'Upper Thomson, Springleaf',
  'D27': 'Yishun, Sembawang',
  'D28': 'Seletar, Yio Chu Kang'
};

export const formatDistrict = (districtCode) => {
  if (!districtCode) return 'Singapore';
  const name = districtMapping[districtCode] || 'Singapore';
  const num = districtCode.replace(/^D0?/, '');
  return `${num} - ${name}`;
};

export const getLaunchStatus = (item) => {
  if (item.unitsSoldPercent === 0 || item.unitsSoldPercent === '0') {
    return 'Launching';
  }
  return 'Launched';
};

export default function ListingsGrid({ listings, onViewDetails }) {
  if (listings.length === 0) {
    return (
      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <i className="fa-solid fa-folder-open" style={{ fontSize: '40px', marginBottom: '12px' }}></i>
        <p style={{ fontSize: '16px', fontWeight: '500' }}>No listings found matching your search filters.</p>
      </div>
    );
  }

  return (
    <section className="listings-grid">
      {listings.map(item => {
        const launchStatus = getLaunchStatus(item);
        const cleanImages = getCleanImages(item);
        const coverImage = cleanImages[0] || 'https://sg.tepcdn.com/public/usr/8b7q6c/026af5-shutterstock-178043579.jpg';
        
        return (
          <article key={item.id} className="property-card">
            {/* Launch Status Badge - Omitted "Launched" as too repetitive, show "Launching Soon" */}
            {launchStatus !== 'Launched' && (
              <span className={`status-badge ${launchStatus.toLowerCase()}`}>
                {launchStatus === 'Launching' ? 'Launching Soon' : launchStatus}
              </span>
            )}

            {/* Property Image - Clicking triggers details view */}
            <div
              className="card-img-wrapper"
              onClick={() => onViewDetails(item.id)}
              style={{ cursor: 'pointer' }}
              title={`View details for ${item.title}`}
            >
              <img
                src={coverImage}
                alt={item.title}
                className="card-img"
                loading="lazy"
              />
            </div>

            {/* Card Content Details */}
            <div className="card-content">
              <h2 className="card-title">{item.title}</h2>
              <div className="card-district">
                District: {formatDistrict(item.district)}
              </div>

              {/* Metro Line Badges */}
              <div className="card-metro-lines" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {getMetroLines(item.district).map(line => (
                  <span
                    key={line}
                    className="metro-badge"
                    style={{
                      backgroundColor: getMetroColor(line) + '15',
                      color: getMetroColor(line),
                      border: `1px solid ${getMetroColor(line)}40`
                    }}
                  >
                    <i className="fa-solid fa-train" style={{ fontSize: '9px' }}></i>
                    {line}
                  </span>
                ))}
              </div>

              <div className="card-specs">
                <div className="spec-item">
                  <span className="spec-label">Property Type</span>
                  <span className="spec-value">{item.propertyType || '-'}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Est. Completion</span>
                  <span className="spec-value">{item.topYear || '-'}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Average PSF</span>
                  <span className="spec-value">
                    {item.psf ? `$${item.psf}` : '-'}
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">% of units sold</span>
                  <span className="spec-value">
                    {item.unitsSoldPercent !== null && item.unitsSoldPercent !== undefined
                      ? `${item.unitsSoldPercent}%`
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="card-action">
                <button
                  className="btn-view"
                  onClick={() => onViewDetails(item.id)}
                >
                  Details
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
export { districtMapping };
