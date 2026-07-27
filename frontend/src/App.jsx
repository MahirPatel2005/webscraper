import React, { useState, useMemo, useEffect } from 'react';
import FilterBar from './components/FilterBar';
import ListingsGrid, { getLaunchStatus, formatDistrict } from './components/ListingsGrid';
import DetailView from './components/DetailView';
import Pagination from './components/Pagination';
import listingsData from '../../data/listings.json';

export const districtToMetroLines = {
  'D01': ['East West Line', 'Downtown Line'],
  'D02': ['East West Line', 'North East Line'],
  'D03': ['East West Line', 'Circle Line'],
  'D04': ['Circle Line', 'North East Line'],
  'D05': ['East West Line', 'Circle Line'],
  'D06': ['East West Line', 'North South Line', 'Downtown Line'],
  'D07': ['East West Line', 'Downtown Line', 'Circle Line'],
  'D08': ['North East Line', 'Downtown Line'],
  'D09': ['North South Line', 'Downtown Line', 'Thomson-East Coast Line'],
  'D10': ['Downtown Line', 'Circle Line'],
  'D11': ['North South Line', 'Downtown Line'],
  'D12': ['North South Line', 'North East Line'],
  'D13': ['Circle Line', 'Downtown Line'],
  'D14': ['East West Line', 'Circle Line'],
  'D15': ['Thomson-East Coast Line', 'East West Line'],
  'D16': ['East West Line', 'Downtown Line'],
  'D17': ['East West Line'],
  'D18': ['East West Line', 'Downtown Line'],
  'D19': ['North East Line', 'Circle Line'],
  'D20': ['North South Line', 'Circle Line'],
  'D21': ['Downtown Line'],
  'D22': ['East West Line'],
  'D23': ['Downtown Line', 'North South Line'],
  'D24': ['North South Line'],
  'D25': ['North South Line'],
  'D26': ['Thomson-East Coast Line'],
  'D27': ['North South Line'],
  'D28': ['North South Line']
};

export function getCleanImages(item) {
  if (!item) return [];
  let list = [];
  if (Array.isArray(item.images)) {
    list = [...item.images];
  }
  
  // Filter the list of images first
  let cleanList = list.filter(img => {
    if (!img) return false;
    const lower = img.toLowerCase();
    // Exclude s3fs-public files that are png or have ?v= query params (typical of agent flyers or layout diagrams)
    if (lower.includes('s3fs-public') && (lower.includes('.png') || lower.includes('?v='))) {
      return false;
    }
    if (lower.includes('contact-card') || lower.includes('advertisement') || lower.includes('banner')) {
      return false;
    }
    return true;
  });

  // Handle main cover image
  if (item.image) {
    const mainLower = item.image.toLowerCase();
    
    // We categorize the main cover image as an ad/flyer if it is in s3fs-public and we have other clean gallery images from tepcdn
    const isMainAd = mainLower.includes('s3fs-public') && 
                     (mainLower.includes('.png') || 
                      mainLower.includes('?v=') || 
                      cleanList.some(img => img.toLowerCase().includes('img.tepcdn.com')));

    if (!isMainAd && !cleanList.includes(item.image)) {
      cleanList = [item.image, ...cleanList];
    }
  }

  return cleanList;
}

export default function App() {
  // Navigation State: selected property ID (slug)
  const [selectedId, setSelectedId] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    district: '',
    metroLine: '',
    status: '',
    developer: ''
  });

  // Sorting & Virtual Tour states
  const [sortBy, setSortBy] = useState('recommended');
  const [virtualTour, setVirtualTour] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Reset pagination to first page when search query, filters, sort, or virtual tour changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortBy, virtualTour]);

  // Dynamic lists of unique dropdown options directly derived from the dataset
  const uniqueOptions = useMemo(() => {
    const types = new Set();
    const districts = new Set();
    const developers = new Set();
    const metroLines = new Set();

    listingsData.forEach(item => {
      if (item.propertyType) types.add(item.propertyType);
      if (item.district) {
        districts.add(item.district);
        const lines = districtToMetroLines[item.district] || [];
        lines.forEach(line => metroLines.add(line));
      }
      if (item.developer) developers.add(item.developer);
    });

    return {
      types: Array.from(types).sort(),
      districts: Array.from(districts).sort(),
      metroLines: Array.from(metroLines).sort(),
      developers: Array.from(developers).sort()
    };
  }, []);

  // Filter listings based on multi-select parameters
  const filteredListings = useMemo(() => {
    return listingsData.filter(item => {
      // 1. Text Search matching title, developer name, property type, or district
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDeveloper = item.developer?.toLowerCase().includes(q);
        const matchesDistrictCode = item.district?.toLowerCase().includes(q);
        const matchesDistrictName = formatDistrict(item.district).toLowerCase().includes(q);
        const matchesType = item.propertyType?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDeveloper && !matchesDistrictCode && !matchesDistrictName && !matchesType) return false;
      }

      // 2. Property Type filter
      if (filters.type && item.propertyType !== filters.type) return false;

      // 3. District filter
      if (filters.district && item.district !== filters.district) return false;

      // 4. Metro Line filter
      if (filters.metroLine) {
        const lines = districtToMetroLines[item.district] || [];
        if (!lines.includes(filters.metroLine)) return false;
      }

      // 5. Launch status filter
      if (filters.status) {
        const itemStatus = getLaunchStatus(item);
        if (itemStatus !== filters.status) return false;
      }

      // 6. Developer filter
      if (filters.developer && item.developer !== filters.developer) return false;

      // 7. Virtual Tour filter (Mocking: allow some properties to show virtual tours)
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

  // Get listings for current page
  const paginatedListings = useMemo(() => {
    const totalPages = Math.ceil(sortedListings.length / itemsPerPage);
    const activePage = currentPage > totalPages ? 1 : currentPage;
    const startIndex = (activePage - 1) * itemsPerPage;
    return sortedListings.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedListings, currentPage]);

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
            onSelectProperty={(id) => {
              setSelectedId(id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          /* Listings Grid View */
          <>
            <div className="breadcrumbs">
              <span>New Launches</span>
            </div>

            <div className="listings-header">
              <h1 className="dream-home-title">Find your dream home</h1>
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
              listings={paginatedListings}
              onViewDetails={setSelectedId}
            />

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalItems={sortedListings.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
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
