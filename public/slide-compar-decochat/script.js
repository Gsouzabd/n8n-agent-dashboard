// Slide Navigation
let currentSlide = 1;
const totalSlides = 12;

function updateSlideDisplay() {
    // Hide all slides
    document.querySelectorAll('.slide').forEach(slide => {
        slide.classList.remove('active');
    });
    
    // Show current slide
    const activeSlide = document.querySelector(`.slide[data-slide="${currentSlide}"]`);
    if (activeSlide) {
        activeSlide.classList.add('active');
    }
    
    // Update slide indicator
    document.querySelector('.current-slide').textContent = currentSlide;
    document.querySelector('.total-slides').textContent = totalSlides;
    
    // Update progress bar
    const progressPercent = (currentSlide / totalSlides) * 100;
    document.querySelector('.progress-fill').style.width = progressPercent + '%';
    
    // Update navigation buttons
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (prevBtn) {
        prevBtn.disabled = currentSlide === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentSlide === totalSlides;
    }
}

function nextSlide() {
    if (currentSlide < totalSlides) {
        currentSlide++;
        updateSlideDisplay();
    }
}

function prevSlide() {
    if (currentSlide > 1) {
        currentSlide--;
        updateSlideDisplay();
    }
}

function goToSlide(slideNumber) {
    if (slideNumber >= 1 && slideNumber <= totalSlides) {
        currentSlide = slideNumber;
        updateSlideDisplay();
    }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevSlide();
    } else if (e.key === 'Home') {
        e.preventDefault();
        goToSlide(1);
    } else if (e.key === 'End') {
        e.preventDefault();
        goToSlide(totalSlides);
    } else if (e.key >= '1' && e.key <= '9') {
        const slideNum = parseInt(e.key);
        if (slideNum <= totalSlides) {
            goToSlide(slideNum);
        }
    }
});

// Touch/Swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    
    if (swipeDistance > swipeThreshold) {
        // Swipe right - go to previous slide
        prevSlide();
    } else if (swipeDistance < -swipeThreshold) {
        // Swipe left - go to next slide
        nextSlide();
    }
}

// Mouse wheel navigation
let wheelTimeout;
document.addEventListener('wheel', (e) => {
    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
        if (e.deltaY > 0) {
            nextSlide();
        } else if (e.deltaY < 0) {
            prevSlide();
        }
    }, 100);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateSlideDisplay();
    
    // Add click handlers to navigation buttons
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', prevSlide);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', nextSlide);
    }
});

// Fullscreen toggle (F key)
document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
    }
});

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Print mode (P key)
document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        window.print();
    }
});

// Escape to exit fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen();
    }
});

// Prevent context menu on right click (optional, for cleaner presentation mode)
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Debug: Log current slide number (remove in production)
document.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
        console.log('Current slide:', currentSlide);
    }
});

// Export functions for inline onclick handlers
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.goToSlide = goToSlide;


