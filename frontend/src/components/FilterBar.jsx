import React, { useState, useRef, useEffect } from 'react';
import { getMetroColor, getMetroAbbr } from './ListingsGrid';

function CustomRangeSelect({ label, prefix, value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/,/g, '');
    if (val === '' || /^\d+$/.test(val)) {
      onChange(val);
    }
  };

  // Format value with commas for display in the input
  const formatDisplayValue = (val) => {
    if (!val) return '';
    return String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="custom-select-group" ref={containerRef}>
      <label className="custom-select-label">{label}</label>
      <div 
        className={`custom-select-trigger-wrapper ${isOpen ? 'open' : ''}`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <span className="custom-select-badge">{prefix}</span>
        <input
          ref={inputRef}
          type="text"
          className="custom-select-input"
          placeholder={placeholder}
          value={formatDisplayValue(value)}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
        />
        <i className="fa-solid fa-sort custom-select-caret"></i>
      </div>

      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value || '');
            return (
              <div 
                key={opt.value} 
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur from closing before click registers
                  handleSelect(opt.value);
                }}
              >
                <div className={`custom-select-radio-circle ${isSelected ? 'checked' : ''}`}>
                  {isSelected && <div className="custom-select-radio-inner" />}
                </div>
                <span className="custom-select-option-text">{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomMetroSelect({ label, value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-select-group" ref={containerRef}>
      <label className="custom-select-label">{label}</label>
      <div 
        className={`custom-select-trigger-wrapper ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        {selectedOption && selectedOption.value ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              className="metro-badge-logo" 
              style={{ 
                backgroundColor: getMetroColor(selectedOption.value), 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff', 
                borderRadius: '8px', 
                fontSize: '9px', 
                fontWeight: '800',
                width: '32px',
                height: '18px',
                lineHeight: 1
              }}
            >
              {getMetroAbbr(selectedOption.value)}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>
              {selectedOption.label}
            </span>
          </div>
        ) : (
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>{placeholder}</span>
        )}
        <i className="fa-solid fa-sort custom-select-caret" style={{ marginLeft: 'auto' }}></i>
      </div>

      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div 
                key={opt.value} 
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              >
                <div className={`custom-select-radio-circle ${isSelected ? 'checked' : ''}`}>
                  {isSelected && <div className="custom-select-radio-inner" />}
                </div>
                {opt.value ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      className="metro-badge-logo" 
                      style={{ 
                        backgroundColor: getMetroColor(opt.value), 
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff', 
                        borderRadius: '8px', 
                        fontSize: '9px', 
                        fontWeight: '800',
                        width: '32px',
                        height: '18px',
                        lineHeight: 1
                      }}
                    >
                      {getMetroAbbr(opt.value)}
                    </span>
                    <span className="custom-select-option-text">{opt.label}</span>
                  </div>
                ) : (
                  <span className="custom-select-option-text">{opt.label}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  const priceMinOptions = [
    { label: 'No Min', value: '' },
    { label: '200,000', value: '200000' },
    { label: '300,000', value: '300000' },
    { label: '400,000', value: '400000' },
    { label: '500,000', value: '500000' },
    { label: '700,000', value: '700000' },
    { label: '1,000,000', value: '1000000' },
    { label: '1,200,000', value: '1200000' },
    { label: '1,500,000', value: '1500000' },
    { label: '2,000,000', value: '2000000' },
    { label: '3,000,000', value: '3000000' },
    { label: '5,000,000', value: '5000000' }
  ];

  const priceMaxOptions = [
    { label: 'No Max', value: '' },
    { label: '1,000,000', value: '1000000' },
    { label: '1,500,000', value: '1500000' },
    { label: '2,000,000', value: '2000000' },
    { label: '2,500,000', value: '2500000' },
    { label: '3,000,000', value: '3000000' },
    { label: '4,000,000', value: '4000000' },
    { label: '5,000,000', value: '5000000' },
    { label: '6,000,000', value: '6000000' },
    { label: '7,000,000', value: '7000000' },
    { label: '8,000,000', value: '8000000' },
    { label: '9,000,000', value: '9000000' },
    { label: '10,000,000', value: '10000000' },
    { label: '12,000,000', value: '12000000' },
    { label: '15,000,000', value: '15000000' },
    { label: '18,000,000', value: '18000000' },
    { label: '20,000,000', value: '20000000' }
  ];

  const sizeMinOptions = [
    { label: 'No Min', value: '' },
    { label: '500', value: '500' },
    { label: '700', value: '700' },
    { label: '1,000', value: '1000' },
    { label: '1,200', value: '1200' },
    { label: '1,500', value: '1500' },
    { label: '2,000', value: '2000' }
  ];

  const sizeMaxOptions = [
    { label: 'No Max', value: '' },
    { label: '800', value: '800' },
    { label: '1,000', value: '1000' },
    { label: '1,200', value: '1200' },
    { label: '1,500', value: '1500' },
    { label: '2,000', value: '2000' },
    { label: '3,000', value: '3000' },
    { label: '5,000', value: '5000' }
  ];

  const metroOptions = [
    { label: 'All Metro Lines', value: '' },
    ...uniqueOptions.metroLines.map(line => ({ label: line, value: line }))
  ];

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
        <div className="filter-group search-actions-group">
          <label>&nbsp;</label>
          <div className="search-actions-flex">
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
              className="btn-reset-top"
              title="Reset Filters"
              type="button"
            >
              <i className="fa-solid fa-rotate-left"></i> Reset
            </button>
          </div>
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

        <CustomMetroSelect
          label="Metro Line"
          placeholder="All Metro Lines"
          value={filters.metroLine}
          onChange={(val) => handleFilterChange('metroLine', val)}
          options={metroOptions}
        />

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

        {/* Minimum Size */}
        <CustomRangeSelect
          label="Minimum Size"
          prefix="sqft"
          placeholder="Min"
          value={filters.minSize}
          onChange={(val) => handleFilterChange('minSize', val)}
          options={sizeMinOptions}
        />

        {/* Maximum Size */}
        <CustomRangeSelect
          label="Maximum Size"
          prefix="sqft"
          placeholder="Max"
          value={filters.maxSize}
          onChange={(val) => handleFilterChange('maxSize', val)}
          options={sizeMaxOptions}
        />

        {/* Minimum Price */}
        <CustomRangeSelect
          label="Minimum Price"
          prefix="S$"
          placeholder="Min Price"
          value={filters.minPrice}
          onChange={(val) => handleFilterChange('minPrice', val)}
          options={priceMinOptions}
        />

        {/* Maximum Price */}
        <CustomRangeSelect
          label="Maximum Price"
          prefix="S$"
          placeholder="Max Price"
          value={filters.maxPrice}
          onChange={(val) => handleFilterChange('maxPrice', val)}
          options={priceMaxOptions}
        />


      </div>
    </section>
  );
}
