import React from 'react';

export default function FilterBar({
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  uniqueOptions
}) {
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({
      type: '',
      district: '',
      metroLine: '',
      status: '',
      developer: '',
      beds: '',
      minSize: '',
      maxSize: '',
      minPrice: '',
      maxPrice: ''
    });
  };

  return (
    <section className="filter-bar">
      {/* Search Row */}
      <div className="filter-search-row">
        <div className="filter-group search-group">
          <label htmlFor="search-input">Search Properties</label>
          <div className="input-with-icon">
            <i className="fa-solid fa-magnifying-glass input-icon"></i>
            <input
              type="text"
              id="search-input"
              className="filter-input with-icon"
              placeholder="Enter project name, district, developer, etc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-group button-group search-btn-group">
          <label>&nbsp;</label>
          <button
            onClick={() => {
              const el = document.getElementById('results-count');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="btn-search"
            type="button"
          >
            <i className="fa-solid fa-magnifying-glass search-btn-icon"></i> Search
          </button>
        </div>
      </div>

      {/* Filters Options Grid */}
      <div className="filter-options-grid">
        <div className="filter-group">
          <label htmlFor="type-select">Property Type</label>
          <select
            id="type-select"
            className="filter-input"
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="">All Property Types</option>
            {uniqueOptions.types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="district-select">District</label>
          <select
            id="district-select"
            className="filter-input"
            value={filters.district}
            onChange={(e) => handleFilterChange('district', e.target.value)}
          >
            <option value="">All Districts</option>
            {uniqueOptions.districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="metro-select">Metro Line</label>
          <select
            id="metro-select"
            className="filter-input"
            value={filters.metroLine}
            onChange={(e) => handleFilterChange('metroLine', e.target.value)}
          >
            <option value="">All Metro Lines</option>
            {uniqueOptions.metroLines.map(line => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="beds-select">Bedrooms</label>
          <select
            id="beds-select"
            className="filter-input"
            value={filters.beds}
            onChange={(e) => handleFilterChange('beds', e.target.value)}
          >
            <option value="">Any Bedrooms</option>
            <option value="1">1 Bed</option>
            <option value="2">2 Beds</option>
            <option value="3">3 Beds</option>
            <option value="4">4 Beds</option>
            <option value="5">5+ Beds</option>
          </select>
        </div>

        <div className="filter-group size-range-group">
          <label>Size Range (sqft)</label>
          <div className="range-inputs">
            <input
              type="number"
              placeholder="Min"
              className="filter-input range-input"
              value={filters.minSize}
              onChange={(e) => handleFilterChange('minSize', e.target.value)}
            />
            <span className="range-separator">-</span>
            <input
              type="number"
              placeholder="Max"
              className="filter-input range-input"
              value={filters.maxSize}
              onChange={(e) => handleFilterChange('maxSize', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group price-range-group">
          <label>Price Range (SGD)</label>
          <div className="range-inputs">
            <input
              type="number"
              placeholder="Min Price"
              className="filter-input range-input"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            />
            <span className="range-separator">-</span>
            <input
              type="number"
              placeholder="Max Price"
              className="filter-input range-input"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group reset-group">
          <label>&nbsp;</label>
          <button
            onClick={handleClearFilters}
            className="btn-reset-wide"
            title="Reset Filters"
            type="button"
          >
            <i className="fa-solid fa-rotate-left"></i> Reset
          </button>
        </div>
      </div>
    </section>
  );
}
