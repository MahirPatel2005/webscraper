import React, { useState, useRef, useEffect } from 'react';
import { getMetroColor, getMetroAbbr, formatDistrict } from './ListingsGrid';

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

function MultiSelectDropdown({
  label,
  selectedValues = [],
  onChange,
  options = [],
  placeholder,
  isMetro = false,
  isDistrict = false,
  enableSearch = false,
  searchPlaceholder = "Search..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

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

  // Reset search query when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleToggleOption = (val) => {
    let next;
    if (selectedValues.includes(val)) {
      next = selectedValues.filter(x => x !== val);
    } else {
      next = [...selectedValues, val];
    }
    onChange(next);
  };

  const handleSelectAll = () => {
    const filteredVals = filteredOptions.map(opt => opt.value).filter(Boolean);
    const uniqueCombined = Array.from(new Set([...selectedValues, ...filteredVals]));
    onChange(uniqueCombined);
  };

  const handleClearAll = () => {
    if (searchQuery) {
      const filteredVals = filteredOptions.map(opt => opt.value);
      onChange(selectedValues.filter(x => !filteredVals.includes(x)));
    } else {
      onChange([]);
    }
  };

  const filteredOptions = options.filter(opt => {
    if (!opt.value) return false; // skip the 'all' option
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const labelLower = opt.label.toLowerCase();
    const valLower = opt.value.toLowerCase();
    return labelLower.includes(term) || valLower.includes(term);
  });

  const renderTriggerContent = () => {
    if (selectedValues.length === 0) {
      return <span style={{ color: '#94a3b8', fontSize: '14px' }}>{placeholder}</span>;
    }

    if (isMetro) {
      const displayed = selectedValues.slice(0, 2);
      const remainingCount = selectedValues.length - displayed.length;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
          {displayed.map(val => (
            <span 
              key={val}
              className="metro-badge-logo" 
              style={{ 
                backgroundColor: getMetroColor(val), 
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
              {getMetroAbbr(val)}
            </span>
          ))}
          {remainingCount > 0 && (
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
              +{remainingCount}
            </span>
          )}
        </div>
      );
    }

    if (isDistrict) {
      const displayed = selectedValues.slice(0, 2);
      const remainingCount = selectedValues.length - displayed.length;
      let text = displayed.join(', ');
      if (remainingCount > 0) {
        text += ` (+${remainingCount})`;
      }
      return <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>{text}</span>;
    }

    const selectedLabels = selectedValues.map(val => {
      const opt = options.find(o => o.value === val);
      return opt ? opt.label : val;
    });

    const displayed = selectedLabels.slice(0, 2);
    const remainingCount = selectedLabels.length - displayed.length;
    let text = displayed.join(', ');
    if (remainingCount > 0) {
      text += ` (+${remainingCount})`;
    }
    return <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>{text}</span>;
  };

  return (
    <div className="custom-select-group" ref={containerRef}>
      <label className="custom-select-label">{label}</label>
      <div 
        className={`custom-select-trigger-wrapper ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        {renderTriggerContent()}
        <i className="fa-solid fa-sort custom-select-caret" style={{ marginLeft: 'auto' }}></i>
      </div>

      {isOpen && (
        <div className="custom-select-dropdown" style={{ display: 'flex', flexDirection: 'column' }}>
          {enableSearch && (
            <div className="custom-dropdown-search-wrapper">
              <div className="custom-dropdown-search-icon-wrapper">
                <i className="fa-solid fa-magnifying-glass custom-dropdown-search-icon"></i>
                <input
                  type="text"
                  className="custom-dropdown-search-input"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <div className="custom-dropdown-actions-bar">
            <button 
              type="button" 
              className="custom-dropdown-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAll();
              }}
            >
              Select All
            </button>
            <button 
              type="button" 
              className={`custom-dropdown-action-btn ${selectedValues.length === 0 ? 'disabled' : ''}`}
              disabled={selectedValues.length === 0}
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
            >
              Clear
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div 
                    key={opt.value} 
                    className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleOption(opt.value);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  >
                    <div className={`custom-select-checkbox ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <i className="fa-solid fa-check" style={{ fontSize: '9px' }}></i>}
                    </div>
                    {isMetro ? (
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
                      <span className="custom-select-option-text" style={{ fontSize: '13px' }}>{opt.label}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
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
  };

  const priceMinOptions = [
    { label: 'No Min', value: '' },
    { label: '500,000', value: '500000' },
    { label: '1,000,000', value: '1000000' },
    { label: '1,500,000', value: '1500000' },
    { label: '2,000,000', value: '2000000' },
    { label: '2,500,000', value: '2500000' },
    { label: '3,000,000', value: '3000000' },
    { label: '3,500,000', value: '3500000' },
    { label: '4,000,000', value: '4000000' },
    { label: '4,500,000', value: '4500000' },
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
    { label: '20,000,000', value: '20000000' },
    { label: '25,000,000', value: '25000000' }
  ];

  const sizeMinOptions = [
    { label: 'No Min', value: '' },
    { label: '500', value: '500' },
    { label: '700', value: '700' },
    { label: '1,000', value: '1000' },
    { label: '1,200', value: '1200' },
    { label: '1,500', value: '1500' },
    { label: '2,000', value: '2000' },
    { label: '2,500', value: '2500' }
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

  const propertyTypeOptions = uniqueOptions.types.map(t => ({ label: t, value: t }));

  const districtOptions = uniqueOptions.districts.map(d => ({
    label: formatDistrict(d),
    value: d
  }));

  const metroOptions = uniqueOptions.metroLines.map(line => ({ label: line, value: line }));

  const bedsOptions = [
    { label: 'Studio / 1 Bed', value: '1' },
    { label: '2 Beds', value: '2' },
    { label: '3 Beds', value: '3' },
    { label: '4 Beds', value: '4' },
    { label: '5+ Beds', value: '5' },
    { label: 'Penthouses', value: 'penthouse' }
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
        <MultiSelectDropdown
          label="Property Type"
          placeholder="All Property Types"
          selectedValues={filters.type || []}
          onChange={(val) => handleFilterChange('type', val)}
          options={propertyTypeOptions}
        />

        <MultiSelectDropdown
          label="District"
          placeholder="All Districts"
          selectedValues={filters.district || []}
          onChange={(val) => handleFilterChange('district', val)}
          options={districtOptions}
          isDistrict={true}
          enableSearch={true}
          searchPlaceholder="Search districts..."
        />

        <MultiSelectDropdown
          label="Metro Line"
          placeholder="All Metro Lines"
          selectedValues={filters.metroLine || []}
          onChange={(val) => handleFilterChange('metroLine', val)}
          options={metroOptions}
          isMetro={true}
        />

        <MultiSelectDropdown
          label="Bedrooms"
          placeholder="Any Bedrooms"
          selectedValues={filters.beds || []}
          onChange={(val) => handleFilterChange('beds', val)}
          options={bedsOptions}
        />

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
