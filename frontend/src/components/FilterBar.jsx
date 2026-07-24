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
      tenure: '',
      topYear: '',
      status: '',
      developer: ''
    });
  };

  return (
    <section className="filter-bar">
      <div className="filter-grid">
        <div className="filter-group">
          <label htmlFor="search-input">Project Name</label>
          <input
            type="text"
            id="search-input"
            className="filter-input"
            placeholder="Enter Project Name..."
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
          <label htmlFor="tenure-select">Tenure</label>
          <select
            id="tenure-select"
            className="filter-input"
            value={filters.tenure}
            onChange={(e) => handleFilterChange('tenure', e.target.value)}
          >
            <option value="">Any Tenure</option>
            {uniqueOptions.tenures.map(ten => (
              <option key={ten} value={ten}>{ten}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="top-select">TOP Year</label>
          <select
            id="top-select"
            className="filter-input"
            value={filters.topYear}
            onChange={(e) => handleFilterChange('topYear', e.target.value)}
          >
            <option value="">All TOP Years</option>
            {uniqueOptions.topYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
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

        <button
          onClick={handleClearFilters}
          className="btn-search"
          style={{ backgroundColor: '#64748b' }}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
