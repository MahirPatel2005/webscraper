import React, { useState, useMemo, useEffect, useRef } from 'react';
import FilterBar from './components/FilterBar';
import ListingsGrid, { getLaunchStatus, formatDistrict } from './components/ListingsGrid';
import DetailView from './components/DetailView';
import Pagination from './components/Pagination';
import AdminDashboard from './components/AdminDashboard';
import FeaturedWidget from './components/FeaturedWidget';
import staticListings from '../../data/listings.json';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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
  const [isAdminView, setIsAdminView] = useState(false);
  const [isWidgetView, setIsWidgetView] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || null);
  const [listingsData, setListingsData] = useState(staticListings);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: [],
    district: [],
    metroLine: [],
    status: '',
    developer: '',
    beds: [],
    minSize: '',
    maxSize: '',
    minPrice: '',
    maxPrice: ''
  });

  // Dynamic API Fetch
  const fetchListings = async () => {
    try {
      const headers = {};
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
      const res = await fetch(`${API_BASE}/api/listings`, { headers });
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      setListingsData(data);
    } catch (e) {
      console.warn("Failed to fetch listings from API, falling back to static cache.", e);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [adminToken, isAdminView, isWidgetView]);

  // Hidden admin panel & standalone widget URL parameter toggler
  useEffect(() => {
    const handleHashOrSearch = () => {
      const isParamAdmin = window.location.search.includes('admin=true') || window.location.hash === '#admin';
      const isParamWidget = window.location.search.includes('widget=true') || window.location.pathname === '/widget' || window.location.hash === '#widget';
      setIsAdminView(isParamAdmin);
      setIsWidgetView(isParamWidget);
    };

    handleHashOrSearch();
    window.addEventListener('popstate', handleHashOrSearch);
    window.addEventListener('hashchange', handleHashOrSearch);
    
    return () => {
      window.removeEventListener('popstate', handleHashOrSearch);
      window.removeEventListener('hashchange', handleHashOrSearch);
    };
  }, []);

  // URL Deep Link Navigation Handler (opens property details view if ?id=slug or #detail/slug is present)
  useEffect(() => {
    const handleDeepLinking = () => {
      // Don't intercept deep links if we are inside the standalone widget view
      const isWidget = window.location.search.includes('widget=true') || window.location.pathname === '/widget' || window.location.hash === '#widget';
      if (isWidget) return;

      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('id') || params.get('propertyId');
      
      let hashParam = null;
      if (window.location.hash.startsWith('#detail/')) {
        hashParam = window.location.hash.replace('#detail/', '');
      }
      
      const finalId = idParam || hashParam;
      if (finalId) {
        setSelectedId(finalId);
      }
    };

    handleDeepLinking();
    window.addEventListener('popstate', handleDeepLinking);
    window.addEventListener('hashchange', handleDeepLinking);
    return () => {
      window.removeEventListener('popstate', handleDeepLinking);
      window.removeEventListener('hashchange', handleDeepLinking);
    };
  }, []);

  // Sorting & Virtual Tour states
  const [sortBy, setSortBy] = useState('recommended');
  const [virtualTour, setVirtualTour] = useState(false);

  // Pagination & Grid layout state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [gridColumns, setGridColumns] = useState(3);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const layoutRef = useRef(null);

  // Reset pagination to first page when search query, filters, sort, virtual tour, or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortBy, virtualTour, itemsPerPage]);

  // Click outside to close layout config dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (layoutRef.current && !layoutRef.current.contains(event.target)) {
        setIsLayoutOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      if (filters.type && filters.type.length > 0) {
        if (!item.propertyType || !filters.type.includes(item.propertyType)) return false;
      }

      // 3. District filter
      if (filters.district && filters.district.length > 0) {
        if (!item.district || !filters.district.includes(item.district)) return false;
      }

      // 4. Metro Line filter
      if (filters.metroLine && filters.metroLine.length > 0) {
        const lines = districtToMetroLines[item.district] || [];
        const hasMatch = filters.metroLine.some(line => lines.includes(line));
        if (!hasMatch) return false;
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

      // 8. Bedroom Type filter
      if (filters.beds && filters.beds.length > 0) {
        const matchesAnyBedOption = filters.beds.some(bedOption => {
          if (bedOption === 'penthouse') {
            if (item.layouts && Array.isArray(item.layouts)) {
              return item.layouts.some(l => {
                const desc = l.desc?.toLowerCase() || '';
                return desc.includes('penthouse');
              });
            }
            return false;
          }

          const bedNum = parseInt(bedOption);
          if (isNaN(bedNum)) return false;

          // Check beds string, e.g. "2 - 4" or "1"
          if (item.beds) {
            const parts = item.beds.split('-').map(x => parseInt(x.trim()));
            if (parts.length === 1 && !isNaN(parts[0])) {
              const val = parts[0];
              if (bedNum === 5) {
                if (val >= 5) return true;
              } else {
                if (val === bedNum) return true;
              }
            } else if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              const [min, max] = parts;
              if (bedNum === 5) {
                if (max >= 5) return true;
              } else {
                if (bedNum >= min && bedNum <= max) return true;
              }
            }
          }
          
          // If not matched yet, check layouts
          if (item.layouts && Array.isArray(item.layouts)) {
            return item.layouts.some(l => {
              const desc = l.desc?.toLowerCase() || '';
              const match = desc.match(/(\d+)\s*bed/i);
              
              const isStudio = bedNum === 1 && desc.includes('studio');

              if (match) {
                const val = parseInt(match[1]);
                if (bedNum === 5) {
                  return val >= 5;
                } else {
                  return val === bedNum;
                }
              }
              return isStudio;
            });
          }
          return false;
        });

        if (!matchesAnyBedOption) return false;
      }

      // Helper to get size range
      let propMinSize = null;
      let propMaxSize = null;
      if (item.floorAreaSqft) {
        const parts = item.floorAreaSqft.split('-').map(x => parseInt(x.trim()));
        if (parts.length === 1 && !isNaN(parts[0])) {
          propMinSize = parts[0];
          propMaxSize = parts[0];
        } else if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          propMinSize = parts[0];
          propMaxSize = parts[1];
        }
      }
      if ((propMinSize === null || propMaxSize === null) && item.layouts && Array.isArray(item.layouts)) {
        const sqfts = item.layouts.map(l => parseInt(l.sqft)).filter(x => !isNaN(x));
        if (sqfts.length > 0) {
          const minL = Math.min(...sqfts);
          const maxL = Math.max(...sqfts);
          if (propMinSize === null || minL < propMinSize) propMinSize = minL;
          if (propMaxSize === null || maxL > propMaxSize) propMaxSize = maxL;
        }
      }

      // 9. Size range filter
      if (filters.minSize) {
        const minSizeLimit = parseInt(filters.minSize);
        if (!isNaN(minSizeLimit)) {
          if (propMaxSize === null || propMaxSize < minSizeLimit) return false;
        }
      }
      if (filters.maxSize) {
        const maxSizeLimit = parseInt(filters.maxSize);
        if (!isNaN(maxSizeLimit)) {
          if (propMinSize === null || propMinSize > maxSizeLimit) return false;
        }
      }

      // 10. Price range filter (estimated as psf * size)
      if (filters.minPrice || filters.maxPrice) {
        if (!item.psf || propMinSize === null || propMaxSize === null) {
          return false;
        }
        const estMinPrice = item.psf * propMinSize;
        const estMaxPrice = item.psf * propMaxSize;
        
        if (filters.minPrice) {
          const minPriceLimit = parseFloat(filters.minPrice);
          if (!isNaN(minPriceLimit) && estMaxPrice < minPriceLimit) return false;
        }
        if (filters.maxPrice) {
          const maxPriceLimit = parseFloat(filters.maxPrice);
          if (!isNaN(maxPriceLimit) && estMinPrice > maxPriceLimit) return false;
        }
      }

      return true;
    });
  }, [searchQuery, filters, virtualTour]);

  // Sort filtered listings
  const sortedListings = useMemo(() => {
    const list = [...filteredListings];

    // Feature scoring helper to identify launching soon & recently launched
    const isFeatured = (item) => {
      if (item.featured) return true; // explicitly featured by admin!
      
      // 1. Launching soon (units sold = 0)
      if (item.unitsSoldPercent === 0 || item.unitsSoldPercent === '0') {
        return true;
      }
      // 2. Recently launched (units sold > 0 and <= 20%)
      if (item.unitsSoldPercent !== null && item.unitsSoldPercent !== undefined) {
        const sold = parseFloat(item.unitsSoldPercent);
        if (!isNaN(sold) && sold > 0 && sold <= 20) {
          return true;
        }
      }
      // 3. Estimated completion year in the future (say, >= 2028)
      if (item.topYear) {
        const year = parseInt(item.topYear);
        if (!isNaN(year) && year >= 2028) {
          return true;
        }
      }
      return false;
    };

    if (sortBy === 'recommended') {
      // Put featured ones first, maintaining their relative order otherwise
      return list.sort((a, b) => {
        const featA = isFeatured(a) ? 1 : 0;
        const featB = isFeatured(b) ? 1 : 0;
        return featB - featA; // Put true (1) before false (0)
      });
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
  }, [sortedListings, currentPage, itemsPerPage]);

  return (
    <div className="app-wrapper">
      {/* Main Body content */}
      <main className="container" style={{ paddingTop: '30px' }}>
        {isWidgetView ? (
          <FeaturedWidget
            listings={listingsData}
            onSelectProperty={setSelectedId}
            isStandalone={true}
          />
        ) : isAdminView ? (
          <AdminDashboard
            token={adminToken}
            setToken={setAdminToken}
            onBackToSite={() => {
              if (window.location.hash === '#admin') {
                window.location.hash = '';
              }
              if (window.location.search.includes('admin=true')) {
                const url = new URL(window.location.href);
                url.searchParams.delete('admin');
                window.history.pushState({}, '', url.toString().replace(/\?$/, ''));
              }
              setIsAdminView(false);
            }}
          />
        ) : selectedId ? (
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
            <div className="page-title-container">
              <h1 className="page-title">New Launches</h1>
            </div>

            {/* <div className="listings-header">
              <h1 className="dream-home-title">Find your dream home</h1>
              <p>Start finding new property with EdgeProp. See our recommended property below</p>
            </div> */}

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
              {/* <div className="launches-found" id="results-count">
                {sortedListings.length} new launches found
              </div> */}
              <div className="meta-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

                <div className="layout-config-container" ref={layoutRef}>
                  <button 
                    className={`layout-config-btn ${isLayoutOpen ? 'active' : ''}`}
                    onClick={() => setIsLayoutOpen(!isLayoutOpen)}
                    title="Adjust Grid & Page Size"
                    type="button"
                  >
                    <svg width="20" height="18" viewBox="0 0 20 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="layout-icon">
                      <rect x="1.5" y="1.5" width="17" height="15" rx="3" />
                      <line x1="6.5" y1="1.5" x2="6.5" y2="16.5" />
                    </svg>
                  </button>

                  {isLayoutOpen && (
                    <div className="layout-config-dropdown">
                      <div className="layout-config-section">
                        <div className="layout-config-section-title">Grid Layout</div>
                        <div className="layout-config-options">
                          {[2, 3, 4].map(cols => (
                            <button
                              key={cols}
                              className={`layout-config-opt-btn ${gridColumns === cols ? 'selected' : ''}`}
                              onClick={() => setGridColumns(cols)}
                              type="button"
                            >
                              {cols} Cols
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="layout-config-section">
                        <div className="layout-config-section-title">Listings Per Page</div>
                        <div className="layout-config-options grid-opts">
                          {[6, 9, 12, 15, 18, 24, 30, 999].map(num => (
                            <button
                              key={num}
                              className={`layout-config-opt-btn ${itemsPerPage === num ? 'selected' : ''}`}
                              onClick={() => {
                                setItemsPerPage(num);
                                setCurrentPage(1);
                              }}
                              type="button"
                            >
                              {num === 999 ? 'All' : num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Grid display */}
            <ListingsGrid
              listings={paginatedListings}
              onViewDetails={setSelectedId}
              columns={gridColumns}
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
      {/* <footer style={{ borderTop: '1px solid var(--border-color)', padding: '30px 20px', marginTop: '60px', backgroundColor: '#ffffff' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          <div>&copy; {new Date().getFullYear()} EdgeProp Singapore. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Use</a>
          </div>
        </div>
      </footer> */}
    </div>
  );
}
