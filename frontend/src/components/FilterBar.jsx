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
          <input
            type="text"
            id="search-input"
            className="filter-input"
            placeholder="Enter project name, district, developer, etc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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

        <div className="filter-group">
          <label htmlFor="status-select">Status</label>
          <select
            id="status-select"
            className="filter-input"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Launching">Launching</option>
            <option value="Launched">Launched</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="developer-select">Developer</label>
          <select
            id="developer-select"
            className="filter-input"
            value={filters.developer}
            onChange={(e) => handleFilterChange('developer', e.target.value)}
          >
            <option value="">All Developers</option>
            {uniqueOptions.developers.map(dev => (
              <option key={dev} value={dev}>{dev}</option>
            ))}
          </select>
        </div>

        <div className="filter-group button-group" style={{ display: 'flex', gap: '8px', flexDirection: 'row', alignItems: 'center' }}>
          <button
            onClick={() => {
              const el = document.getElementById('results-count');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="btn-search"
            style={{ flexGrow: 1 }}
            type="button"
          >
            <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '8px' }}></i> Search
          </button>
          
          <button
            onClick={handleClearFilters}
            className="btn-search"
            style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '11px 16px' }}
            title="Reset Filters"
            type="button"
          >
            <i className="fa-solid fa-rotate-left"></i>
          </button>
        </div>
      </div>
    </section>
  );
}
