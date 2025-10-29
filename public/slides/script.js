// Slide Management
let currentSlide = 1;
const totalSlides = 12;

// Elements
const slidesContainer = document.getElementById('slidesContainer');
const slides = document.querySelectorAll('.slide');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const slideCounter = document.getElementById('slideCounter');
const progressFill = document.getElementById('progressFill');

// Initialize
function init() {
    updateSlide(currentSlide);
    setupEventListeners();
    animateCurrentSlide();
}

// Setup Event Listeners
function setupEventListeners() {
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'ArrowRight') nextSlide();
        if (e.key === 'Home') goToSlide(1);
        if (e.key === 'End') goToSlide(totalSlides);
    });
    
    // Touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    
    slidesContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    slidesContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        if (touchEndX < touchStartX - 50) nextSlide();
        if (touchEndX > touchStartX + 50) prevSlide();
    }
}

// Navigation Functions
function prevSlide() {
    if (currentSlide > 1) {
        currentSlide--;
        updateSlide(currentSlide);
    }
}

function nextSlide() {
    if (currentSlide < totalSlides) {
        currentSlide++;
        updateSlide(currentSlide);
    }
}

function goToSlide(n) {
    if (n >= 1 && n <= totalSlides) {
        currentSlide = n;
        updateSlide(currentSlide);
    }
}

// Update Slide
function updateSlide(n) {
    // Remove active class from all slides
    slides.forEach(slide => {
        slide.classList.remove('active');
    });
    
    // Add active class to current slide
    const currentSlideElement = document.querySelector(`[data-slide="${n}"]`);
    currentSlideElement.classList.add('active');
    
    // Update counter
    slideCounter.textContent = `${n} / ${totalSlides}`;
    
    // Update progress bar
    const progressPercent = (n / totalSlides) * 100;
    progressFill.style.width = `${progressPercent}%`;
    
    // Update button states
    prevBtn.disabled = (n === 1);
    nextBtn.disabled = (n === totalSlides);
    
    // Animate current slide
    setTimeout(() => {
        animateCurrentSlide();
    }, 100);
}

// Animate Current Slide
function animateCurrentSlide() {
    const currentSlideElement = document.querySelector('.slide.active');
    
    // Animate stat numbers on slide 1
    if (currentSlide === 1) {
        animateStatNumbers();
    }
    
    // Add fade-in animation to cards
    const cards = currentSlideElement.querySelectorAll('.problem-card, .case-card, .pricing-card, .contact-item');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Animate Stat Numbers (CountUp Effect)
function animateStatNumbers() {
    const statNumbers = document.querySelectorAll('.stat-number[data-count]');
    
    statNumbers.forEach(stat => {
        const target = parseInt(stat.getAttribute('data-count'));
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60fps
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            stat.textContent = Math.floor(current);
        }, 16);
    });
}

// Auto-play (optional)
let autoPlayInterval = null;

function startAutoPlay() {
    autoPlayInterval = setInterval(() => {
        if (currentSlide < totalSlides) {
            nextSlide();
        } else {
            stopAutoPlay();
        }
    }, 8000); // 8 seconds per slide
}

function stopAutoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
}

// Stop autoplay on user interaction
document.addEventListener('click', stopAutoPlay);
document.addEventListener('keydown', stopAutoPlay);
document.addEventListener('touchstart', stopAutoPlay);

// Fullscreen toggle (optional)
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Add fullscreen button (optional)
document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
    }
});

// Progress Bar Click Navigation
progressFill.parentElement.addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    const targetSlide = Math.ceil(clickPercent * totalSlides);
    goToSlide(targetSlide);
});

// Preload next slide images (optimization)
function preloadNextSlide() {
    const nextSlideNum = currentSlide + 1;
    if (nextSlideNum <= totalSlides) {
        const nextSlide = document.querySelector(`[data-slide="${nextSlideNum}"]`);
        const images = nextSlide.querySelectorAll('img');
        images.forEach(img => {
            const tempImg = new Image();
            tempImg.src = img.src;
        });
    }
}

// Call preload after each slide change
function updateSlideWithPreload(n) {
    updateSlide(n);
    preloadNextSlide();
}

// Particles Background (for Hero slide)
function createParticles() {
    const heroSlide = document.querySelector('[data-slide="1"] .slide-content');
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0.3';
    canvas.style.zIndex = '-1';
    
    heroSlide.style.position = 'relative';
    heroSlide.prepend(canvas);
    
    const ctx = canvas.getContext('2d');
    canvas.width = heroSlide.offsetWidth;
    canvas.height = heroSlide.offsetHeight;
    
    const particles = [];
    const particleCount = 50;
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.color = `rgba(255, 107, 0, ${Math.random() * 0.5 + 0.2})`;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
        
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // Draw connections
        particles.forEach((p1, i) => {
            particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.strokeStyle = `rgba(255, 107, 0, ${0.2 - distance / 500})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            });
        });
        
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
}

// Print Mode
function setupPrintMode() {
    window.addEventListener('beforeprint', () => {
        slides.forEach(slide => {
            slide.classList.add('active');
            slide.style.pageBreakAfter = 'always';
        });
    });
    
    window.addEventListener('afterprint', () => {
        updateSlide(currentSlide);
    });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    init();
    createParticles();
    setupPrintMode();
    
    // Uncomment to enable auto-play
    // startAutoPlay();
});

// Export for external control (if needed)
window.slideControl = {
    next: nextSlide,
    prev: prevSlide,
    goTo: goToSlide,
    startAutoPlay,
    stopAutoPlay,
    currentSlide: () => currentSlide
};



