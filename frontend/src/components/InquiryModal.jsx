import React, { useState } from 'react';

export default function InquiryModal({ isOpen, onClose, propertyName }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: `Hi, I am interested in ${propertyName}. Please send me more details. Thanks!`
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate API request
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      message: `Hi, I am interested in ${propertyName}. Please send me more details. Thanks!`
    });
    onClose();
  };

  return (
    <div className={`modal-backdrop ${isOpen ? 'open' : ''}`} onClick={handleReset}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleReset}>
          &times;
        </button>

        {!submitted ? (
          <>
            <h2 className="modal-title">Enquire about {propertyName}</h2>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="modal-name">Name</label>
                <input
                  type="text"
                  id="modal-name"
                  className="form-input"
                  required
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-email">Email Address</label>
                <input
                  type="email"
                  id="modal-email"
                  className="form-input"
                  required
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-phone">Phone Number</label>
                <input
                  type="tel"
                  id="modal-phone"
                  className="form-input"
                  required
                  placeholder="e.g. +65 9123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-message">Message</label>
                <textarea
                  id="modal-message"
                  className="form-input form-input-textarea"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                ></textarea>
              </div>

              <button type="submit" className="btn-sidebar solid" style={{ marginTop: '10px' }}>
                Submit Enquiry
              </button>
            </form>
          </>
        ) : (
          <div className="modal-success">
            <i className="fa-solid fa-circle-check"></i>
            <h2>Thank You!</h2>
            <p>Your enquiry for <strong>{propertyName}</strong> has been successfully submitted.</p>
            <p>An representative will get back to you shortly.</p>
            <button
              onClick={handleReset}
              className="btn-sidebar solid"
              style={{ marginTop: '24px', maxWidth: '200px', marginInline: 'auto' }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
