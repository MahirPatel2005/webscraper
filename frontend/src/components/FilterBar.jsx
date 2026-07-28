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
      developer: ''
    });
  };

  return (
    <section className="filter-bar">
      <div className="filter-grid">
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

        <div className="filter-group button-group">
          <div className="filter-actions">
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
            
            <button
              onClick={handleClearFilters}
              className="btn-reset"
              title="Reset Filters"
              type="button"
            >
              <i className="fa-solid fa-rotate-left"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
