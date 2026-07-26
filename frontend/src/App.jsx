import React, { useState, useMemo } from 'react';
import FilterBar from './components/FilterBar';
import ListingsGrid, { getLaunchStatus } from './components/ListingsGrid';
import DetailView from './components/DetailView';
import listingsData from '../../data/listings.json';

export default function App() {
  // Navigation State: selected property ID (slug)
  const [selectedId, setSelectedId] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    district: '',
    tenure: '',
    topYear: '',
    status: '',
    developer: ''
  });

  // Sorting & Virtual Tour states
  const [sortBy, setSortBy] = useState('recommended');
  const [virtualTour, setVirtualTour] = useState(false);

  // Dynamic lists of unique dropdown options directly derived from the dataset
  const uniqueOptions = useMemo(() => {
    const types = new Set();
    const districts = new Set();
    const tenures = new Set();
    const topYears = new Set();
    const developers = new Set();

    listingsData.forEach(item => {
      if (item.propertyType) types.add(item.propertyType);
      if (item.district) districts.add(item.district);
      
      // Clean tenure representation (e.g. Freehold or 99 years)
      if (item.tenure) {
        const cleanTenure = item.tenure.toLowerCase().includes('freehold') ? 'Freehold' : 'Leasehold';
        tenures.add(cleanTenure);
      }
      
      if (item.topYear) topYears.add(item.topYear);
      if (item.developer) developers.add(item.developer);
    });

    return {
      types: Array.from(types).sort(),
      districts: Array.from(districts).sort(),
      tenures: Array.from(tenures).sort(),
      topYears: Array.from(topYears).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)),
      developers: Array.from(developers).sort()
    };
  }, []);

  // Filter listings based on multi-select parameters
  const filteredListings = useMemo(() => {
    return listingsData.filter(item => {
      // 1. Text Search matching title or developer name
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDeveloper = item.developer?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDeveloper) return false;
      }

      // 2. Property Type filter
      if (filters.type && item.propertyType !== filters.type) return false;

      // 3. District filter
      if (filters.district && item.district !== filters.district) return false;

      // 4. Tenure filter
      if (filters.tenure) {
        const cleanTenure = item.tenure?.toLowerCase().includes('freehold') ? 'Freehold' : 'Leasehold';
        if (cleanTenure !== filters.tenure) return false;
      }

      // 5. TOP Year filter
      if (filters.topYear && item.topYear !== filters.topYear) return false;

      // 6. Launch status filter
      if (filters.status) {
        const itemStatus = getLaunchStatus(item);
        if (itemStatus !== filters.status) return false;
      }

      // 7. Developer filter
      if (filters.developer && item.developer !== filters.developer) return false;

      // 8. Virtual Tour filter (Mocking: allow some properties to show virtual tours)
      if (virtualTour) {
        // Just show items ending in even characters as mock tour-enabled
        const isTourEnabled = item.id.charCodeAt(item.id.length - 1) % 2 === 0;
        if (!isTourEnabled) return false;
      }

      return true;
    });
  }, [searchQuery, filters, virtualTour]);

  // Sort filtered listings
  const sortedListings = useMemo(() => {
    const list = [...filteredListings];
    if (sortBy === 'recommended') {
      return list; // Keep original scraped order
    }
    
    return list.sort((a, b) => {
      if (sortBy === 'sold-desc') {
        const soldA = a.unitsSoldPercent !== null ? a.unitsSoldPercent : -1;
        const soldB = b.unitsSoldPercent !== null ? b.unitsSoldPercent : -1;
        return soldB - soldA;
      }
      if (sortBy === 'psf-asc') {
        const psfA = a.psf !== null ? a.psf : Infinity;
        const psfB = b.psf !== null ? b.psf : Infinity;
        return psfA - psfB;
      }
      if (sortBy === 'psf-desc') {
        const psfA = a.psf !== null ? a.psf : -1;
        const psfB = b.psf !== null ? b.psf : -1;
        return psfB - psfA;
      }
      if (sortBy === 'units-desc') {
        const unitsA = a.totalUnits !== null ? a.totalUnits : -1;
        const unitsB = b.totalUnits !== null ? b.totalUnits : -1;
        return unitsB - unitsA;
      }
      return 0;
    });
  }, [filteredListings, sortBy]);

  return (
    <div className="app-wrapper">
      {/* Header Bar */}
      {/* <header>
        <div className="container header-content">
          <div className="logo" onClick={() => setSelectedId(null)}>
            <i className="fa-solid fa-building-user"></i> EdgeProp<span>.sg</span>
          </div>
          <ul className="nav-links">
            <li>
              <span
                onClick={() => setSelectedId(null)}
                className={`link ${!selectedId ? 'active' : ''}`}
                style={{ cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}
              >
                New Launches
              </span>
            </li>
            <li><a href="#buy">Buy</a></li>
            <li><a href="#rent">Rent</a></li>
            <li><a href="#news">News</a></li>
          </ul>
        </div>
      </header> */}

      {/* Main Body content */}
      <main className="container">
        {selectedId ? (
          /* Detail Page View */
          <DetailView
            id={selectedId}
            listings={listingsData}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          /* Listings Grid View */
          <>
            <div className="breadcrumbs">
              <span>New Launches</span>
            </div>

            <div className="listings-header">
              <h1>All New Property Launches</h1>
              <p>Start finding new property with EdgeProp. See our recommended property below</p>
            </div>

            {/* Filter section */}
            <FilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filters={filters}
              setFilters={setFilters}
              uniqueOptions={uniqueOptions}
            />

            {/* Result statistics and sorting */}
            <section className="listings-meta">
              <div className="launches-found" id="results-count">
                {sortedListings.length} new launches found
              </div>
              <div className="meta-controls">
                {/* <label className="meta-checkbox-label">
                  <input
                    type="checkbox"
                    id="tour-checkbox"
                    className="meta-checkbox"
                    checked={virtualTour}
                    onChange={(e) => setVirtualTour(e.target.checked)}
                  />
                  Virtual Tour
                </label> */}
                
                <div className="sort-select-wrapper">
                  <span className="sort-label">Sort by</span>
                  <select
                    id="sort-select"
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="recommended">Recommended</option>
                    <option value="sold-desc">% Sold: High to Low</option>
                    <option value="psf-asc">PSF: Low to High</option>
                    <option value="psf-desc">PSF: High to Low</option>
                    <option value="units-desc">Total Units: High to Low</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Grid display */}
            <ListingsGrid
              listings={sortedListings}
              onViewDetails={setSelectedId}
            />
          </>
        )}
      </main>

      {/* Elegant Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '30px 20px', marginTop: '60px', backgroundColor: '#ffffff' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          <div>&copy; {new Date().getFullYear()} EdgeProp Singapore. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Use</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
