import React, { useState, useEffect, useMemo } from 'react';
import { formatDistrict } from './ListingsGrid';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const PROPERTY_TYPES = ['Condo', 'Apartment', 'Landed', 'Executive Condo', 'Semi-Detached', 'Terrace', 'Bungalow'];
const DISTRICTS = [
  'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 
  'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D20', 
  'D21', 'D22', 'D23', 'D24', 'D25', 'D26', 'D27', 'D28'
];

export default function AdminDashboard({ token, setToken, onBackToSite }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState('');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null); // null if adding new property
  
  // Form fields state
  const [formFields, setFormFields] = useState({
    title: '',
    propertyType: 'Condo',
    district: 'D11',
    address: '',
    beds: '',
    baths: '',
    floorAreaSqft: '',
    price: '',
    psf: '',
    topYear: '',
    unitsSoldPercent: '',
    tenure: '99 years',
    totalUnits: '',
    developer: '',
    image: '',
    imagesRaw: '', // textarea of URLs (one per line)
    facilitiesRaw: '', // comma-separated facilities
    disabled: false,
    featured: false,
  });

  // Dynamic layout items inside the form
  const [formLayouts, setFormLayouts] = useState([]);

  // Load listings on mount or when token changes
  useEffect(() => {
    fetchListings();
  }, [token]);

  const fetchListings = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/api/listings`, { headers });
      if (!res.ok) {
        throw new Error('Failed to fetch listings');
      }
      const data = await res.json();
      setListings(data);
    } catch (err) {
      setError(err.message || 'Error fetching listings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      setToken(data.token);
      localStorage.setItem('adminToken', data.token);
      setSuccess('Logged in successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('adminToken');
    setListings([]);
    setSuccess('Logged out successfully.');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Toggle Features directly on dashboard list
  const handleToggleFeature = async (item) => {
    try {
      const updatedValue = !item.featured;
      const res = await fetch(`${API_BASE}/api/listings/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ featured: updatedValue })
      });
      if (!res.ok) {
        throw new Error('Failed to update listing');
      }
      setListings(prev => prev.map(p => p.id === item.id ? { ...p, featured: updatedValue } : p));
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle Disabled status directly on dashboard list
  const handleToggleDisabled = async (item) => {
    try {
      const updatedValue = !item.disabled;
      const res = await fetch(`${API_BASE}/api/listings/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ disabled: updatedValue })
      });
      if (!res.ok) {
        throw new Error('Failed to update listing');
      }
      setListings(prev => prev.map(p => p.id === item.id ? { ...p, disabled: updatedValue } : p));
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete listing
  const handleDeleteListing = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/listings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete listing');
      }
      setSuccess(`Listing "${title}" deleted successfully.`);
      setTimeout(() => setSuccess(''), 3000);
      setListings(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // Open form modal for adding a listing
  const handleAddClick = () => {
    setEditingProperty(null);
    setFormFields({
      title: '',
      propertyType: 'Condo',
      district: 'D11',
      address: '',
      beds: '',
      baths: '',
      floorAreaSqft: '',
      price: '',
      psf: '',
      topYear: '',
      unitsSoldPercent: '',
      tenure: '99 years',
      totalUnits: '',
      developer: '',
      image: '',
      imagesRaw: '',
      facilitiesRaw: '',
      disabled: false,
      featured: false,
    });
    setFormLayouts([]);
    setIsFormOpen(true);
  };

  // Open form modal for editing a listing
  const handleEditClick = (item) => {
    setEditingProperty(item);
    setFormFields({
      title: item.title || '',
      propertyType: item.propertyType || 'Condo',
      district: item.district || 'D11',
      address: item.address || '',
      beds: item.beds || '',
      baths: item.baths !== null && item.baths !== undefined ? String(item.baths) : '',
      floorAreaSqft: item.floorAreaSqft || '',
      price: item.price !== null && item.price !== undefined ? String(item.price) : '',
      psf: item.psf !== null && item.psf !== undefined ? String(item.psf) : '',
      topYear: item.topYear || '',
      unitsSoldPercent: item.unitsSoldPercent !== null && item.unitsSoldPercent !== undefined ? String(item.unitsSoldPercent) : '',
      tenure: item.tenure || '99 years',
      totalUnits: item.totalUnits !== null && item.totalUnits !== undefined ? String(item.totalUnits) : '',
      developer: item.developer || '',
      image: item.image || '',
      imagesRaw: Array.isArray(item.images) ? item.images.join('\n') : '',
      facilitiesRaw: Array.isArray(item.facilities) ? item.facilities.join(', ') : '',
      disabled: !!item.disabled,
      featured: !!item.featured,
    });
    setFormLayouts(Array.isArray(item.layouts) ? item.layouts.map(l => ({ ...l })) : []);
    setIsFormOpen(true);
  };

  // Manage dynamic layout inputs
  const handleAddLayoutRow = () => {
    setFormLayouts(prev => [...prev, { desc: '', type: '', sqft: '', units: '' }]);
  };

  const handleRemoveLayoutRow = (index) => {
    setFormLayouts(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleLayoutChange = (index, field, value) => {
    setFormLayouts(prev => prev.map((row, idx) => {
      if (idx === index) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // Handle Form Submission (Add/Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Parse image URLs and facilities arrays
    const images = formFields.imagesRaw
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    const facilities = formFields.facilitiesRaw
      .split(',')
      .map(fac => fac.trim())
      .filter(fac => fac.length > 0);

    // Build payload
    const payload = {
      title: formFields.title,
      propertyType: formFields.propertyType,
      district: formFields.district,
      address: formFields.address,
      beds: formFields.beds || null,
      baths: formFields.baths ? parseInt(formFields.baths, 10) : null,
      floorAreaSqft: formFields.floorAreaSqft || null,
      price: formFields.price ? parseFloat(formFields.price) : null,
      psf: formFields.psf ? parseFloat(formFields.psf) : null,
      topYear: formFields.topYear,
      unitsSoldPercent: formFields.unitsSoldPercent !== '' ? parseFloat(formFields.unitsSoldPercent) : null,
      tenure: formFields.tenure,
      totalUnits: formFields.totalUnits ? parseInt(formFields.totalUnits, 10) : null,
      developer: formFields.developer,
      image: formFields.image,
      images,
      facilities,
      layouts: formLayouts.filter(l => l.desc || l.type || l.sqft),
      disabled: formFields.disabled,
      featured: formFields.featured,
    };

    const isEdit = !!editingProperty;
    const url = isEdit ? `/api/listings/${editingProperty.id}` : '/api/listings';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(`${API_BASE}${url}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save property listing');
      }

      setSuccess(`Property "${formFields.title}" ${isEdit ? 'updated' : 'created'} successfully!`);
      setTimeout(() => setSuccess(''), 4000);
      setIsFormOpen(false);
      fetchListings(); // reload list
    } catch (err) {
      setError(err.message);
    }
  };

  // Filter listings based on search text and dropdowns
  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDeveloper = item.developer?.toLowerCase().includes(q);
        const matchesDistrict = item.district?.toLowerCase().includes(q);
        const matchesType = item.propertyType?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDeveloper && !matchesDistrict && !matchesType) return false;
      }
      // 2. Type Filter
      if (selectedTypeFilter && item.propertyType !== selectedTypeFilter) return false;
      // 3. District Filter
      if (selectedDistrictFilter && item.district !== selectedDistrictFilter) return false;
      
      return true;
    });
  }, [listings, searchQuery, selectedTypeFilter, selectedDistrictFilter]);

  if (!token) {
    // LOGIN PANEL UI
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '20px' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          padding: '40px 30px',
          width: '100%',
          maxWidth: '440px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: '50%',
              background: 'rgba(255, 82, 34, 0.1)',
              color: 'var(--primary)',
              marginBottom: '16px'
            }}>
              <i className="fa-solid fa-lock" style={{ fontSize: '24px' }}></i>
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--navy-dark)' }}>Admin Login</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>SHE Real Estate Management Panel</p>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '20px',
              border: '1px solid #fecaca'
            }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="login-username" style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Username</label>
              <input
                type="text"
                id="login-username"
                required
                className="form-input"
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%'
                }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="login-password" style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Password</label>
              <input
                type="password"
                id="login-password"
                required
                className="form-input"
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%'
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>

            <button type="submit" className="btn-sidebar solid" style={{ padding: '12px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', marginTop: '10px' }}>
              Sign In
            </button>

            <button
              type="button"
              onClick={onBackToSite}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '10px',
                textDecoration: 'underline'
              }}
            >
              Back to Public Listings
            </button>
          </form>
        </div>
      </div>
    );
  }

  // LOGGED IN DASHBOARD UI
  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Admin Toolbar Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '30px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--navy-dark)' }}>Property Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Welcome Elaine. Manage your listings and toggle what gets displayed.
            <span style={{ marginLeft: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: 'var(--navy-dark)', fontWeight: '600', fontSize: '12px', display: 'inline-block' }}>
              {listings.length} Total Properties
            </span>
            {filteredListings.length !== listings.length && (
              <span style={{ marginLeft: '6px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 82, 34, 0.1)', color: 'var(--primary)', fontWeight: '600', fontSize: '12px', display: 'inline-block' }}>
                {filteredListings.length} Filtered
              </span>
            )}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleAddClick}
            className="btn-sidebar solid"
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fa-solid fa-plus"></i> Add Property
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'var(--transition)'
            }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i> Logout
          </button>
          
          <button
            onClick={onBackToSite}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'var(--transition)'
            }}
          >
            <i className="fa-solid fa-home"></i> Public Site
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {success && (
        <div style={{
          backgroundColor: '#f0fdf4',
          color: '#16a34a',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '20px',
          border: '1px solid #bbf7d0'
        }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i>
          {success}
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#ef4444',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '20px',
          border: '1px solid #fecaca'
        }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
          {error}
        </div>
      )}

      {/* Search & Filters */}
      <section style={{
        background: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            fontSize: '14px'
          }}></i>
          <input
            type="text"
            placeholder="Search listings by title, developer, district..."
            style={{
              padding: '10px 14px 10px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              width: '100%',
              outline: 'none'
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
            value={selectedDistrictFilter}
            onChange={(e) => setSelectedDistrictFilter(e.target.value)}
          >
            <option value="">All Districts</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </section>

      {/* Listings Table / List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '32px', color: 'var(--primary)' }}></i>
          <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Loading listings...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)'
        }}>
          <i className="fa-solid fa-folder-open" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
          <h3>No properties found</h3>
          <p style={{ marginTop: '6px' }}>Try adjusting your filters or search search text.</p>
        </div>
      ) : (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: '600', color: '#475569' }}>Property</th>
                  <th style={{ padding: '16px 20px', fontWeight: '600', color: '#475569' }}>District & Address</th>
                  <th style={{ padding: '16px 20px', fontWeight: '600', color: '#475569' }}>Price Details</th>
                  <th style={{ padding: '16px 20px', fontWeight: '600', color: '#475569' }}>Origin</th>
                  <th style={{ padding: '16px 20px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Featured</th>
                  <th style={{ padding: '16px 20px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Display</th>
                  <th style={{ padding: '16px 20px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    {/* Property Cover and Title */}
                    <td style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={item.image || 'https://sg.tepcdn.com/public/usr/8b7q6c/026af5-shutterstock-178043579.jpg'}
                        alt={item.title}
                        style={{ width: '60px', height: '44px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--navy-dark)', fontSize: '15px' }}>{item.title}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{item.propertyType || 'Condo'}</div>
                      </div>
                    </td>

                    {/* District */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '500', color: '#334155' }}>{item.district}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.address}>
                        {item.address || 'Singapore'}
                      </div>
                    </td>

                    {/* Pricing */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--primary)' }}>
                        {item.price ? `$${(item.price / 1000000).toFixed(2)}M` : 'N/A'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                        {item.psf ? `$${item.psf} PSF` : 'N/A'}
                      </div>
                    </td>

                    {/* Source Status */}
                    <td style={{ padding: '16px 20px' }}>
                      {item.custom ? (
                        <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>Custom</span>
                      ) : (
                        <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>Scraped</span>
                      )}
                    </td>

                    {/* Toggle Feature */}
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleFeature(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '18px',
                          color: item.featured ? '#eab308' : '#cbd5e1',
                          outline: 'none'
                        }}
                        title={item.featured ? 'Featured (click to remove)' : 'Feature this property'}
                      >
                        <i className={item.featured ? 'fa-solid fa-star' : 'fa-regular fa-star'}></i>
                      </button>
                    </td>

                    {/* Toggle Display / Disable */}
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleDisabled(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '18px',
                          color: item.disabled ? '#ef4444' : '#22c55e',
                          outline: 'none'
                        }}
                        title={item.disabled ? 'Disabled (Hidden on site, click to show)' : 'Active (Visible, click to hide)'}
                      >
                        <i className={item.disabled ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
                      </button>
                    </td>

                    {/* Action buttons */}
                    <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleEditClick(item)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginRight: '8px',
                          transition: 'var(--transition)'
                        }}
                      >
                        <i className="fa-solid fa-pen" style={{ marginRight: '4px' }}></i> Edit
                      </button>

                      <button
                        onClick={() => handleDeleteListing(item.id, item.title)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: '#fef2f2',
                          color: '#ef4444',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        <i className="fa-solid fa-trash" style={{ marginRight: '4px' }}></i> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORM MODAL (ADD / EDIT LISTING) */}
      {isFormOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--navy-dark)' }}>
                  {editingProperty ? `Edit Listing: ${editingProperty.title}` : 'Add Custom Property Launch'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                  {editingProperty ? 'Modify listing details and overrides.' : 'Fill in the information below to add a property.'}
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body (Scrollable form) */}
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '24px', overflowY: 'auto', flex: '1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Section 1: Basic Info */}
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--navy-dark)', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '14px' }}>
                    Basic Information
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Property Title *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.title}
                        onChange={(e) => setFormFields({ ...formFields, title: e.target.value })}
                        placeholder="e.g. The Hillshore"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Property Type</label>
                      <select
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.propertyType}
                        onChange={(e) => setFormFields({ ...formFields, propertyType: e.target.value })}
                      >
                        {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>District</label>
                      <select
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.district}
                        onChange={(e) => setFormFields({ ...formFields, district: e.target.value })}
                      >
                        {DISTRICTS.map(d => <option key={d} value={d}>{formatDistrict(d)}</option>)}
                      </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Full Address</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.address}
                        onChange={(e) => setFormFields({ ...formFields, address: e.target.value })}
                        placeholder="e.g. 292 Pasir Panjang Road"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Developer</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.developer}
                        onChange={(e) => setFormFields({ ...formFields, developer: e.target.value })}
                        placeholder="e.g. City Developments Limited"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Technical Specifications & Price */}
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--navy-dark)', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '14px' }}>
                    Specifications & Price Details
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Beds Range / Type</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.beds}
                        onChange={(e) => setFormFields({ ...formFields, beds: e.target.value })}
                        placeholder="e.g. 2 - 4"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Baths (min)</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.baths}
                        onChange={(e) => setFormFields({ ...formFields, baths: e.target.value })}
                        placeholder="e.g. 2"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Floor Area Sqft Range</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.floorAreaSqft}
                        onChange={(e) => setFormFields({ ...formFields, floorAreaSqft: e.target.value })}
                        placeholder="e.g. 646 - 1496"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Starting Price ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.price}
                        onChange={(e) => setFormFields({ ...formFields, price: e.target.value })}
                        placeholder="e.g. 1500000"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Average PSF ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.psf}
                        onChange={(e) => setFormFields({ ...formFields, psf: e.target.value })}
                        placeholder="e.g. 2333"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Est. Completion (Year)</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.topYear}
                        onChange={(e) => setFormFields({ ...formFields, topYear: e.target.value })}
                        placeholder="e.g. 2029"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>% of Units Sold</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.unitsSoldPercent}
                        onChange={(e) => setFormFields({ ...formFields, unitsSoldPercent: e.target.value })}
                        placeholder="e.g. 42.5"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Total Units</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.totalUnits}
                        onChange={(e) => setFormFields({ ...formFields, totalUnits: e.target.value })}
                        placeholder="e.g. 499"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Tenure</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.tenure}
                        onChange={(e) => setFormFields({ ...formFields, tenure: e.target.value })}
                        placeholder="e.g. Freehold or 99 years"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Media */}
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--navy-dark)', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '14px' }}>
                    Media (Images)
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Cover Image URL</label>
                      <input
                        type="url"
                        className="form-input"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        value={formFields.image}
                        onChange={(e) => setFormFields({ ...formFields, image: e.target.value })}
                        placeholder="https://example.com/cover.jpg"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Gallery Image URLs (One URL per line)</label>
                      <textarea
                        className="form-input"
                        rows="3"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
                        value={formFields.imagesRaw}
                        onChange={(e) => setFormFields({ ...formFields, imagesRaw: e.target.value })}
                        placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* Section 4: Facilities */}
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--navy-dark)', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '14px' }}>
                    Facilities & Amenities
                  </h3>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Facilities (Comma-separated)</label>
                    <textarea
                      className="form-input"
                      rows="2"
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                      value={formFields.facilitiesRaw}
                      onChange={(e) => setFormFields({ ...formFields, facilitiesRaw: e.target.value })}
                      placeholder="Meadow Lounge, 50m Lap Pool, Pool Deck, Gymnasium, Grand Lawn"
                    ></textarea>
                  </div>
                </div>

                {/* Section 5: Unit Distribution / Layouts */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--navy-dark)', margin: 0 }}>
                      Unit Distribution
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddLayoutRow}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: '#f1f5f9',
                        color: 'var(--navy-dark)',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i> Add Row
                    </button>
                  </div>

                  {formLayouts.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>No unit layout distributions defined.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {formLayouts.map((row, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)) 40px', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Desc (e.g. 2 Bed)"
                            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            value={row.desc || ''}
                            onChange={(e) => handleLayoutChange(idx, 'desc', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Type (e.g. Type B1)"
                            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            value={row.type || ''}
                            onChange={(e) => handleLayoutChange(idx, 'type', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Sqft (e.g. 646)"
                            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            value={row.sqft || ''}
                            onChange={(e) => handleLayoutChange(idx, 'sqft', e.target.value)}
                          />
                          <input
                            type="number"
                            placeholder="No. of Units"
                            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            value={row.units || ''}
                            onChange={(e) => handleLayoutChange(idx, 'units', e.target.value ? parseInt(e.target.value, 10) : '')}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveLayoutRow(idx)}
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#ef4444',
                              border: 'none',
                              borderRadius: '4px',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 6: Settings Flags */}
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--navy-dark)', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '14px' }}>
                    Publishing Settings
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                      <input
                        type="checkbox"
                        checked={formFields.featured}
                        onChange={(e) => setFormFields({ ...formFields, featured: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span>Featured Property (displayed at the top of recommendations)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                      <input
                        type="checkbox"
                        checked={formFields.disabled}
                        onChange={(e) => setFormFields({ ...formFields, disabled: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ color: formFields.disabled ? '#ef4444' : 'inherit' }}>
                        Disable Property (DO NOT DISPLAY / Hide from public view)
                      </span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Modal Footer (Actions) */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-sidebar solid"
                  style={{
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {editingProperty ? 'Save Changes' : 'Create Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
