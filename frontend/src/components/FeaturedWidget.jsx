import React, { useState, useEffect, useRef } from 'react';

// Extract first high-quality image from property images array (same as getCleanImages)
function getWidgetCoverImage(item) {
  if (!item) return 'https://sg.tepcdn.com/public/usr/8b7q6c/026af5-shutterstock-178043579.jpg';
  
  let cleanList = [];
  if (Array.isArray(item.images) && item.images.length > 0) {
    cleanList = item.images;
  } else {
    try {
      if (typeof item.images === 'string') {
        const parsed = JSON.parse(item.images);
        if (Array.isArray(parsed)) cleanList = parsed;
      }
    } catch (e) {}
  }
  
  return cleanList[0] || item.image || 'https://sg.tepcdn.com/public/usr/8b7q6c/026af5-shutterstock-178043579.jpg';
}

export default function FeaturedWidget({ listings, onSelectProperty, isStandalone = false }) {
  // Filter active, non-disabled, and featured listings.
  // Fall back to top 4 active listings if none are featured.
  let baseListings = listings.filter(l => l.featured && !l.disabled && l.status !== 'delisted');
  if (baseListings.length === 0) {
    baseListings = listings.filter(l => !l.disabled && l.status !== 'delisted').slice(0, 4);
  }

  const N = baseListings.length;
  if (N === 0) return null;

  // Triple the list to enable seamless infinite circular scrolling on both ends
  const clonedList = [...baseListings, ...baseListings, ...baseListings];

  // Start in the middle set (index N)
  const [currentIndex, setCurrentIndex] = useState(N);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [paused, setPaused] = useState(false);
  const autoPlayRef = useRef();

  const slideWidth = 344; // 320px card width + 24px gap

  const nextSlide = () => {
    setIsTransitioning(true);
    setCurrentIndex(prev => prev + 1);
  };

  const prevSlide = () => {
    setIsTransitioning(true);
    setCurrentIndex(prev => prev - 1);
  };

  // Set up auto-play reference callback
  useEffect(() => {
    autoPlayRef.current = nextSlide;
  });

  // Autoplay Timer: runs every 3 seconds unless paused by mouse hover
  useEffect(() => {
    if (paused) return;
    const play = () => {
      autoPlayRef.current();
    };
    const interval = setInterval(play, 3000);
    return () => clearInterval(interval);
  }, [paused]);

  // Instantly reset positions on transition end to simulate infinite looping
  const handleTransitionEnd = () => {
    if (currentIndex >= 2 * N) {
      setIsTransitioning(false);
      setCurrentIndex(currentIndex - N);
    } else if (currentIndex < N) {
      setIsTransitioning(false);
      setCurrentIndex(currentIndex + N);
    }
  };

  // Re-enable transition settings after instant jumps
  useEffect(() => {
    if (!isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  const handleCardClick = (id) => {
    if (isStandalone) {
      const mainUrl = `${window.location.origin}/?id=${id}`;
      window.open(mainUrl, '_blank');
    } else {
      onSelectProperty(id);
    }
  };

  return (
    <section 
      className={`featured-launches-widget ${isStandalone ? 'standalone' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Widget Header Layout */}
      <div className="widget-header">
        <div className="widget-tag-line">
          <span className="widget-play-icon"></span>
          RECENT PROJECTS
        </div>
        <h2 className="widget-main-title">Discover Our Featured Projects</h2>
        
        <div className="widget-navigation-actions">
          <a 
            href="https://sherealestate.sg/properties-for-sale/newdevelopments" 
            target="_top" 
            className="more-projects-link"
          >
            <div className="arrow-square-box">
              <i className="fa-solid fa-arrow-right"></i>
            </div>
            <span>MORE PROJECTS</span>
          </a>
        </div>
      </div>

      {/* Slider Carousel Container */}
      <div className="widget-slider-wrapper">
        <button 
          className="slider-nav-btn left" 
          onClick={prevSlide} 
          aria-label="Scroll left"
        >
          <i className="fa-solid fa-arrow-left-long"></i>
        </button>

        <div className="widget-carousel-viewport" style={{ overflow: 'hidden', width: '100%' }}>
          <div 
            className="widget-slider-track"
            onTransitionEnd={handleTransitionEnd}
            style={{
              display: 'flex',
              gap: '24px',
              transition: isTransitioning ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
              transform: `translateX(-${currentIndex * slideWidth}px)`
            }}
          >
            {clonedList.map((item, index) => {
              const coverImage = getWidgetCoverImage(item);
              return (
                <article 
                  key={`${item.id}-${index}`} 
                  className="widget-slider-card"
                  onClick={() => handleCardClick(item.id)}
                >
                  <div className="widget-card-image-box">
                    <img src={coverImage} alt={item.title} loading="lazy" />
                    <div className="widget-card-overlay"></div>
                  </div>
                  <div className="widget-card-details">
                    <h3 className="widget-card-title">{item.title}</h3>
                    <p className="widget-card-subtitle">
                      {item.propertyType || 'Condo'} · {item.district || 'D11'}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <button 
          className="slider-nav-btn right" 
          onClick={nextSlide} 
          aria-label="Scroll right"
        >
          <i className="fa-solid fa-arrow-right-long"></i>
        </button>
      </div>
    </section>
  );
}
