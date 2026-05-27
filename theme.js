// InnocentZombie Theme Controller
(function () {
    let theme = null;
    try {
        theme = localStorage.getItem("theme");
    } catch (e) {}

    // Ultimate default fallback
    if (!theme || theme === "theme-retro") {
        theme = "theme-glacial-glass";
    }

    // Synchronize back to localStorage
    try {
        localStorage.setItem("theme", theme);
    } catch (e) {}

    document.documentElement.className = theme;
    document.documentElement.classList.add("js-ready");
})();

document.addEventListener("DOMContentLoaded", () => {
    // 1. Page transition initialization
    document.body.classList.add("page-loaded");

    // Intercept local link clicks for smooth page transition
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;

        // Skip target blank, external links, and keyboard modifier clicks
        if (
            link.target === "_blank" ||
            link.hostname !== window.location.hostname ||
            e.metaKey ||
            e.ctrlKey ||
            e.shiftKey ||
            e.altKey
        ) {
            return;
        }

        let href = link.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
            return;
        }

        e.preventDefault();
        document.body.classList.add("page-fade-out");
        
        setTimeout(() => {
            window.location.href = href;
        }, 300); // 300ms matches the CSS transition duration
    });

    // Handle back/forward cache (bfcache) restore
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            document.body.classList.remove("page-fade-out");
            document.body.classList.add("page-loaded");
        }
    });

    // Inject Theme Modal UI and setup click triggers
    const settingsBtn = document.getElementById("theme-settings-btn");
    if (!settingsBtn) return;

    // Check if the modal already exists in document
    let themeModal = document.getElementById("theme-modal");
    if (!themeModal) {
        themeModal = document.createElement("div");
        themeModal.id = "theme-modal";
        themeModal.className = "modal-overlay";
        themeModal.innerHTML = `
            <div class="modal-card-window theme-modal-window" style="max-width: 500px;">
                <button class="modal-close-btn" id="theme-modal-close">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div class="modal-content-pane" style="width: 100%; padding: 2rem;">
                    <h2 class="modal-title" style="margin-bottom: 0.5rem; text-align: center;">Select Theme</h2>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 2rem; text-align: center;">Personalize the catalog interface aesthetic.</p>
                    
                    <div class="theme-options-grid">
                        <div class="theme-opt-card" data-theme-class="theme-aetheria">
                            <div class="theme-opt-preview aetheria-prev">
                                <span style="background-color: #07090e;"></span>
                                <span style="background-color: #a855f7;"></span>
                                <span style="background-color: #06b6d4;"></span>
                            </div>
                            <span class="theme-opt-name">Aetheria (Original)</span>
                        </div>
                        
                        <div class="theme-opt-card" data-theme-class="theme-autumn-mint">
                            <div class="theme-opt-preview autumn-mint-prev">
                                <span style="background-color: #11091c;"></span>
                                <span style="background-color: #df7f58;"></span>
                                <span style="background-color: #b5e2b9;"></span>
                            </div>
                            <span class="theme-opt-name">Autumn Mint</span>
                        </div>
                        
                        <div class="theme-opt-card" data-theme-class="theme-cyberpunk">
                            <div class="theme-opt-preview cyberpunk-prev">
                                <span style="background-color: #030712;"></span>
                                <span style="background-color: #f43f5e;"></span>
                                <span style="background-color: #10b981;"></span>
                            </div>
                            <span class="theme-opt-name">Cyberpunk Neon</span>
                        </div>
                        
                        <div class="theme-opt-card" data-theme-class="theme-solaris">
                            <div class="theme-opt-preview solaris-prev">
                                <span style="background-color: #0a0a0a;"></span>
                                <span style="background-color: #f59e0b;"></span>
                                <span style="background-color: #ef4444;"></span>
                            </div>
                            <span class="theme-opt-name">Solaris Gold</span>
                        </div>
                        
                        <div class="theme-opt-card" data-theme-class="theme-midnight-blaze">
                            <div class="theme-opt-preview midnight-blaze-prev" style="display: flex; width: 100%; height: 48px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                                <span style="flex: 1; background-color: #060204;"></span>
                                <span style="flex: 1; background-color: #ff8b72;"></span>
                                <span style="flex: 1; background-color: #d94165;"></span>
                            </div>
                            <span class="theme-opt-name">Midnight Blaze</span>
                        </div>
                        
                        <div class="theme-opt-card" data-theme-class="theme-glacial-glass">
                            <div class="theme-opt-preview glacial-glass-prev" style="display: flex; width: 100%; height: 48px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                                <span style="flex: 1; background-color: #04060c;"></span>
                                <span style="flex: 1; background-color: #9fb3e8;"></span>
                                <span style="flex: 1; background-color: #eaf0ff;"></span>
                            </div>
                            <span class="theme-opt-name">Glacial Glass</span>
                        </div>
                        
                        <div class="theme-opt-card" data-theme-class="theme-retro-dusk">
                            <div class="theme-opt-preview retro-dusk-prev">
                                <span style="background-color: #0c141c;"></span>
                                <span style="background-color: #fbe6d4;"></span>
                                <span style="background-color: #745a6c;"></span>
                            </div>
                            <span class="theme-opt-name">8-Bit Starry Dusk</span>
                        </div>
                        
                        <div class="theme-opt-card" data-theme-class="theme-retro-emerald">
                            <div class="theme-opt-preview retro-emerald-prev">
                                <span style="background-color: #201533;"></span>
                                <span style="background-color: #ffffff;"></span>
                                <span style="background-color: #52c33f;"></span>
                            </div>
                            <span class="theme-opt-name">8-Bit Emerald Nebula</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(themeModal);
    }

    const themeModalClose = document.getElementById("theme-modal-close");

    // Modal show/hide functions
    const openThemeModal = () => {
        // Highlight the currently selected theme card
        const currentTheme = localStorage.getItem("theme") || "theme-glacial-glass";
        const cards = themeModal.querySelectorAll(".theme-opt-card");
        cards.forEach(card => {
            if (card.getAttribute("data-theme-class") === currentTheme) {
                card.classList.add("active");
            } else {
                card.classList.remove("active");
            }
        });
        themeModal.classList.add("active");
    };

    const closeThemeModal = () => {
        themeModal.classList.remove("active");
    };

    // Event listeners
    settingsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openThemeModal();
    });

    themeModalClose.addEventListener("click", closeThemeModal);
    themeModal.addEventListener("click", (e) => {
        if (e.target === themeModal) closeThemeModal();
    });

    // Theme selection logic
    const themeCards = themeModal.querySelectorAll(".theme-opt-card");
    themeCards.forEach(card => {
        card.addEventListener("click", () => {
            const selectedTheme = card.getAttribute("data-theme-class");
            
            // Set document class
            document.documentElement.className = selectedTheme;
            document.documentElement.classList.add("js-ready");
            
            // Save to localStorage
            localStorage.setItem("theme", selectedTheme);
            
            // Refresh active state
            themeCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            
            // Dynamic particle updates
            if (typeof window.updateEmberColors === "function") {
                window.updateEmberColors();
            }
            
            // Close modal after selection
            setTimeout(closeThemeModal, 200);
        });
    });
});

// Subtle floating glowing embers particle system
(function () {
    document.addEventListener("DOMContentLoaded", () => {
        const canvas = document.createElement("canvas");
        canvas.id = "ember-canvas";
        
        // Inline layout for canvas to avoid initial frame shifts
        canvas.style.position = "fixed";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.zIndex = "-1";
        canvas.style.pointerEvents = "none";
        canvas.style.display = "block";
        
        // HIGH PERFORMANCE OVERRIDE: Force GPU compositing layers to prevent scroll-lag and frame delays!
        canvas.style.transform = "translate3d(0, 0, 0)";
        canvas.style.willChange = "transform";
        canvas.style.backfaceVisibility = "hidden";
        
        // Insert as first child of body to stay behind all other content
        document.body.insertBefore(canvas, document.body.firstChild);
        
        const ctx = canvas.getContext("2d");
        let particles = [];
        let themeColors = [];
        
        // RESOLVE HOISTING BUG: Declare EmberParticle class at the very top of scope
        class EmberParticle {
            constructor() {
                // Stagger births on first load (initial = true)
                this.reset(true);
            }
            
            reset(initial = false) {
                const isSolaris = document.documentElement.className.includes("theme-solaris");
                const isMidnightBlaze = document.documentElement.className.includes("theme-midnight-blaze");
                
                const isGlacialGlass = document.documentElement.className.includes("theme-glacial-glass");
                
                if (isMidnightBlaze || isGlacialGlass) {
                    // --- MIDNIGHT BLAZE & GLACIAL GLASS HORIZONTAL FLOW PHYSICS ---
                    this.x = -60 - Math.random() * 240;
                    this.type = "spark"; // Always sparks under horizontal flow themes
                    
                    const r = Math.random();
                    if (r < 0.15) {
                        this.layer = "outer";
                    } else if (r < 0.45) {
                        this.layer = "main";
                    } else {
                        this.layer = "beam";
                    }
                    
                    if (this.layer === "outer") {
                        // Outer layer sparks: wider vertical band (400px), slower speed, shorter travel (fading out sooner)
                        this.y = (canvas.height / 2) + (Math.random() * 400 - 200);
                        this.size = Math.random() * 0.4 + 0.6; // Even smaller! (0.6 to 1.0)
                        this.vx = (Math.random() * 2.5 + 1.5) * (isGlacialGlass ? 0.35 : 0.4); // Slower on Glacial Glass
                        this.vy = (Math.random() * 0.3 - 0.15) * (isGlacialGlass ? 0.35 : 0.4);
                        this.alpha = initial ? 0 : Math.random() * 0.4 + 0.3; // slightly fainter
                        this.initialAlpha = Math.random() * 0.4 + 0.3;
                        
                        // Fades out sooner (covers 30% to 55% of the screen)
                        const targetTravel = canvas.width * (Math.random() * 0.25 + 0.3);
                        const framesNeeded = targetTravel / this.vx;
                        this.decay = this.initialAlpha / framesNeeded;
                    } else if (this.layer === "main") {
                        // Main central layer sparks: narrow vertical band (100px)
                        this.y = (canvas.height / 2) + (Math.random() * 100 - 50);
                        this.size = Math.random() * 0.4 + 0.8; // Small size (0.8 to 1.2)
                        this.vx = (Math.random() * 4.5 + 2.5) * (isGlacialGlass ? 0.45 : 0.5); // Slower on Glacial Glass
                        this.vy = (Math.random() * 0.4 - 0.2) * (isGlacialGlass ? 0.45 : 0.5);
                        this.alpha = initial ? 0 : Math.random() * 0.5 + 0.45;
                        this.initialAlpha = Math.random() * 0.5 + 0.45;
                        
                        // Covers 50% to 115% of the screen
                        const targetTravel = canvas.width * (Math.random() * 0.4 + 0.75);
                        const framesNeeded = targetTravel / this.vx;
                        this.decay = this.initialAlpha / framesNeeded;
                    } else {
                        // High-Energy Core Beam layer sparks: ultra narrow horizontal band (16px), extremely fast, laser-focused straight line
                        this.y = (canvas.height / 2) + (Math.random() * 16 - 8);
                        this.size = Math.random() * 0.4 + 0.7; // Crisp sizes (0.7 to 1.1)
                        this.vx = (Math.random() * 6.0 + 8.0) * (isGlacialGlass ? 0.95 : 1.0); // Ultra fast! (8.0 to 14.0 px/frame)
                        this.vy = Math.random() * 0.1 - 0.05; // Straight horizontal trajectory
                        this.alpha = initial ? 0 : Math.random() * 0.6 + 0.4;
                        this.initialAlpha = Math.random() * 0.6 + 0.4;
                        
                        // Continuous energy beam: travels across 80% to 120% of the screen
                        const targetTravel = canvas.width * (Math.random() * 0.4 + 0.8);
                        const framesNeeded = targetTravel / this.vx;
                        this.decay = this.initialAlpha / framesNeeded;
                    }
                    
                    // Stagger initial load starting delays up to 600 frames (beam spawns twice as fast up to 300 frames)
                    this.delay = initial ? Math.floor(Math.random() * (this.layer === "beam" ? 300 : 600)) : 0;
                    this.growthSpeed = 0;
                } else if (isSolaris) {
                    // --- SOLARIS GOLD UPWARD PHYSICS ---
                    this.x = Math.random() * canvas.width;
                    this.y = initial ? Math.random() * canvas.height : canvas.height + Math.random() * 20;
                    this.type = Math.random() < 0.35 ? "plume" : "spark";
                    this.delay = initial ? Math.floor(Math.random() * 200) : 0;
                    
                    if (this.type === "plume") {
                        // Billowy, soft gas plume
                        this.size = Math.random() * 12 + 8;
                        this.maxSize = Math.random() * 32 + 28;
                        this.vy = -(Math.random() * 0.9 + 0.45);
                        this.vx = Math.random() * 0.5 - 0.25;
                        this.alpha = initial ? 0 : Math.random() * 0.06 + 0.02;
                        this.initialAlpha = Math.random() * 0.06 + 0.02;
                        
                        const targetTravel = canvas.height * (Math.random() * 0.45 + 0.45);
                        const framesNeeded = targetTravel / Math.abs(this.vy);
                        this.decay = this.initialAlpha / framesNeeded;
                        this.growthSpeed = (this.maxSize - this.size) / framesNeeded;
                    } else {
                        // High-velocity glowing flame spark (Double the speed!)
                        this.size = Math.random() * 2.8 + 1.2;
                        this.vy = -(Math.random() * 2.8 + 1.2);
                        this.vx = Math.random() * 1.2 - 0.6;
                        this.alpha = initial ? 0 : Math.random() * 0.5 + 0.45;
                        this.initialAlpha = Math.random() * 0.5 + 0.45;
                        
                        const targetTravel = canvas.height * (Math.random() * 0.4 + 0.75);
                        const framesNeeded = targetTravel / Math.abs(this.vy);
                        this.decay = this.initialAlpha / framesNeeded;
                        this.growthSpeed = 0;
                    }
                } else {
                    // --- STANDARD THEME SPARK PHYSICS ---
                    this.x = Math.random() * canvas.width;
                    this.y = initial ? Math.random() * canvas.height : canvas.height + Math.random() * 20;
                    this.type = "spark";
                    this.delay = initial ? Math.floor(Math.random() * 200) : 0;
                    this.size = Math.random() * 2.2 + 0.6;
                    this.vy = -(Math.random() * 1.2 + 0.5);
                    this.vx = Math.random() * 0.4 - 0.2;
                    this.alpha = initial ? 0 : Math.random() * 0.5 + 0.3;
                    this.initialAlpha = Math.random() * 0.5 + 0.3;
                    
                    const targetTravel = canvas.height * (Math.random() * 0.4 + 0.75);
                    const framesNeeded = targetTravel / Math.abs(this.vy);
                    this.decay = this.initialAlpha / framesNeeded;
                    this.growthSpeed = 0;
                }
                
                this.color = themeColors[Math.floor(Math.random() * themeColors.length)] || '#a855f7';
                this.wobble = Math.random() * Math.PI * 2;
                this.wobbleSpeed = Math.random() * 0.03 + 0.01;
            }
            
            update() {
                if (this.delay > 0) {
                    this.delay--;
                    return;
                }
                
                const isSolaris = document.documentElement.className.includes("theme-solaris");
                const isMidnightBlaze = document.documentElement.className.includes("theme-midnight-blaze");
                const isGlacialGlass = document.documentElement.className.includes("theme-glacial-glass");
                
                if (isMidnightBlaze || isGlacialGlass) {
                    // Flow horizontally right
                    this.x += this.vx;
                    this.wobble += this.wobbleSpeed;
                    
                    // Horizontal organic wave sway (beam layer remains laser-focused with minimal wobble)
                    const swayFactor = this.layer === "beam" ? 0.05 : 0.25;
                    this.y += this.vy + Math.sin(this.wobble) * swayFactor;
                    // Size remains perfectly constant for a clean, consistent beam look!
                } else {
                    // Upward floating themes
                    this.y += this.vy;
                    this.wobble += this.wobbleSpeed;
                    
                    if (isSolaris) {
                        if (this.type === "plume") {
                            this.x += this.vx + Math.sin(this.wobble * 0.5) * 0.4;
                            this.size = Math.min(this.maxSize, this.size + this.growthSpeed);
                        } else {
                            this.x += this.vx + Math.sin(this.wobble) * 0.35;
                            this.size = Math.max(0.2, this.size - 0.015);
                        }
                    } else {
                        this.x += this.vx + Math.sin(this.wobble) * 0.12;
                    }
                }
                
                // If it was delayed, we fade it in gradually when it starts moving
                if (this.alpha < this.initialAlpha) {
                    this.alpha = Math.min(this.initialAlpha, this.alpha + 0.02);
                } else {
                    this.alpha -= this.decay;
                }
                
                // Offscreen cleanups: sparks resetting
                if (this.alpha <= 0 || 
                    ((isMidnightBlaze || isGlacialGlass) && (this.x > canvas.width + 80 || this.y < -80 || this.y > canvas.height + 80)) || 
                    (!(isMidnightBlaze || isGlacialGlass) && (this.y < -60 || this.x < -60 || this.x > canvas.width + 60))) {
                    this.reset(false);
                }
            }
            
            draw() {
                if (this.delay > 0) return; // invisible until delayed birth triggers!
                
                const isRetro = document.documentElement.className.includes("theme-retro");
                if (isRetro) {
                    // Authentic 8-bit retro pixel block rendering
                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = Math.max(0, Math.min(this.alpha * 0.9, 1));
                    
                    // Slightly larger discrete pixel blocks (4px to 8px)
                    const pixelSize = Math.max(4, Math.round(this.size * 2.5));
                    
                    // Grid lock to a virtual 4px retro rendering layout for authentic frame physics
                    const gridX = Math.round(this.x / 4) * 4;
                    const gridY = Math.round(this.y / 4) * 4;
                    
                    ctx.fillRect(gridX, gridY, pixelSize, pixelSize);
                    return;
                }

                const isSolaris = document.documentElement.className.includes("theme-solaris");
                const isMidnightBlaze = document.documentElement.className.includes("theme-midnight-blaze");
                
                // --- SOLARIS OR MIDNIGHT BLAZE PLUME RENDERING ---
                if ((isSolaris || isMidnightBlaze) && this.type === "plume") {
                    const life = Math.max(0, Math.min(this.alpha / this.initialAlpha, 1));
                    let plumeColor, outerPlumeColor;
                    
                    if (isMidnightBlaze) {
                        // Saturated sunset Midnight Blaze palette transitions
                        if (life > 0.7) {
                            // Peach-White core
                            plumeColor = `rgba(255, 228, 223, ${this.alpha * 0.80})`;
                            outerPlumeColor = `rgba(255, 228, 223, ${this.alpha * 0.35})`;
                        } else if (life > 0.4) {
                            // Salmon Peach
                            plumeColor = `rgba(255, 139, 114, ${this.alpha * 0.55})`;
                            outerPlumeColor = `rgba(255, 139, 114, ${this.alpha * 0.25})`;
                        } else if (life > 0.18) {
                            // Plum Rose
                            plumeColor = `rgba(217, 65, 101, ${this.alpha * 0.30})`;
                            outerPlumeColor = `rgba(217, 65, 101, ${this.alpha * 0.14})`;
                        } else {
                            // Burgundy ash
                            plumeColor = `rgba(140, 37, 67, ${this.alpha * 0.12})`;
                            outerPlumeColor = `rgba(140, 37, 67, ${this.alpha * 0.05})`;
                        }
                    } else {
                        // Solaris Gold transitions
                        if (life > 0.7) {
                            plumeColor = `rgba(254, 240, 138, ${this.alpha * 0.85})`;
                            outerPlumeColor = `rgba(254, 240, 138, ${this.alpha * 0.38})`;
                        } else if (life > 0.4) {
                            plumeColor = `rgba(249, 115, 22, ${this.alpha * 0.6})`;
                            outerPlumeColor = `rgba(249, 115, 22, ${this.alpha * 0.27})`;
                        } else if (life > 0.18) {
                            plumeColor = `rgba(239, 68, 68, ${this.alpha * 0.35})`;
                            outerPlumeColor = `rgba(239, 68, 68, ${this.alpha * 0.16})`;
                        } else {
                            plumeColor = `rgba(75, 85, 99, ${this.alpha * 0.14})`;
                            outerPlumeColor = `rgba(75, 85, 99, ${this.alpha * 0.06})`;
                        }
                    }
                    
                    ctx.save();
                    ctx.globalCompositeOperation = "screen";
                    
                    // Volumetric radial gradient glow (adds gorgeous round blurriness)
                    const grad = ctx.createRadialGradient(
                        this.x, this.y, 0,
                        this.x, this.y, this.size
                    );
                    grad.addColorStop(0, plumeColor);
                    grad.addColorStop(0.4, outerPlumeColor);
                    grad.addColorStop(1, "rgba(0,0,0,0)");
                    
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    return;
                }
                
                const isGlacialGlass = document.documentElement.className.includes("theme-glacial-glass");
                
                // --- GLACIAL GLASS CRYSTAL RENDERING (Glistening Glass Shards) ---
                if (isGlacialGlass && this.type === "spark") {
                    const life = Math.max(0, Math.min(this.alpha / this.initialAlpha, 1));
                    const alpha12 = this.alpha * 0.12;
                    const alpha22 = this.alpha * 0.22;
                    const alpha35 = this.alpha * 0.35;
                    
                    let sparkColor, coreColor;
                    let glow12, glow22, glow35;
                    
                    if (life > 0.6) {
                        sparkColor = `rgba(159, 179, 232, ${this.alpha})`; // Lavender/Periwinkle
                        coreColor = `rgba(234, 240, 255, ${this.alpha})`; // Icy White Core
                        glow12 = `rgba(159, 179, 232, ${alpha12})`;
                        glow22 = `rgba(159, 179, 232, ${alpha22})`;
                        glow35 = `rgba(159, 179, 232, ${alpha35})`;
                    } else if (life > 0.25) {
                        sparkColor = `rgba(124, 145, 204, ${this.alpha})`; // Cool Blue
                        coreColor = `rgba(200, 215, 255, ${this.alpha})`; // Light Blue Core
                        glow12 = `rgba(124, 145, 204, ${alpha12})`;
                        glow22 = `rgba(124, 145, 204, ${alpha22})`;
                        glow35 = `rgba(124, 145, 204, ${alpha35})`;
                    } else {
                        sparkColor = `rgba(61, 76, 114, ${this.alpha})`; // Deep Slate Blue
                        coreColor = `rgba(124, 145, 204, ${this.alpha})`; // Cool Blue Core
                        glow12 = `rgba(61, 76, 114, ${alpha12})`;
                        glow22 = `rgba(61, 76, 114, ${alpha22})`;
                        glow35 = `rgba(61, 76, 114, ${alpha35})`;
                    }
                    
                    const flicker = Math.sin(this.wobble * 4.0) * 0.2 + 0.8;
                    
                    // Elongated horizontal diamond crystal path
                    const blurLength = this.vx * 7.0; 
                    const frontX = this.x;
                    const frontY = this.y;
                    const backX = this.x - blurLength;
                    const backY = this.y;
                    const midX = this.x - blurLength * 0.3; // vertex peak shifted towards head
                    
                    ctx.save();
                    ctx.globalCompositeOperation = "screen";
                    
                    // 1. Draw Outer Glass Glow (Soft atmospheric aura)
                    const rGlow = this.size * 3.0;
                    
                    const gradGlow = ctx.createLinearGradient(backX, backY, frontX, frontY);
                    gradGlow.addColorStop(0, "rgba(0,0,0,0)");
                    gradGlow.addColorStop(0.5, glow12);
                    gradGlow.addColorStop(0.85, glow22);
                    gradGlow.addColorStop(1, "rgba(0,0,0,0)");
                    
                    ctx.fillStyle = gradGlow;
                    ctx.beginPath();
                    ctx.moveTo(frontX, frontY);
                    ctx.lineTo(midX, frontY - rGlow);
                    ctx.lineTo(backX, backY);
                    ctx.lineTo(midX, frontY + rGlow);
                    ctx.closePath();
                    ctx.fill();
                    
                    // 2. Draw Inner Crisp Crystal Shard (Glistening glass core)
                    const rCore = this.size;
                    
                    const gradCore = ctx.createLinearGradient(backX, backY, frontX, frontY);
                    gradCore.addColorStop(0, "rgba(0,0,0,0)");
                    gradCore.addColorStop(0.4, glow35);
                    gradCore.addColorStop(0.85, sparkColor);
                    gradCore.addColorStop(1, coreColor);
                    
                    ctx.fillStyle = gradCore;
                    ctx.beginPath();
                    ctx.moveTo(frontX, frontY);
                    ctx.lineTo(midX, frontY - rCore);
                    ctx.lineTo(backX, backY);
                    ctx.lineTo(midX, frontY + rCore);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.restore();
                    return;
                }
                
                // --- MIDNIGHT BLAZE SPARK RENDERING (Tapered Embers with Motion Blur) ---
                if (isMidnightBlaze && this.type === "spark") {
                    const life = Math.max(0, Math.min(this.alpha / this.initialAlpha, 1));
                    const alpha35 = this.alpha * 0.35;
                    
                    let sparkColor, coreColor;
                    
                    if (life > 0.6) {
                        sparkColor = `rgba(255, 139, 114, ${alpha35})`; // Salmon Peach glow
                        coreColor = `rgba(255, 228, 223, ${this.alpha})`; // White-Peach Core
                    } else if (life > 0.25) {
                        sparkColor = `rgba(217, 65, 101, ${alpha35})`; // Plum Rose glow
                        coreColor = `rgba(255, 180, 200, ${this.alpha})`; // Pink-White Core
                    } else {
                        sparkColor = `rgba(140, 37, 67, ${alpha35})`; // Burgundy glow
                        coreColor = `rgba(217, 65, 101, ${this.alpha})`; // Plum Core
                    }
                    
                    const flicker = Math.sin(this.wobble * 3.5) * 0.15 + 0.85;
                    
                    // Elongated motion blur length based on Y wobble and X velocity
                    const blurLength = this.vx * 6.5; 
                    const frontX = this.x;
                    const frontY = this.y;
                    const backX = this.x - blurLength;
                    const backY = this.y;
                    
                    const grad = ctx.createLinearGradient(backX, backY, frontX, frontY);
                    grad.addColorStop(0, "rgba(0,0,0,0)");
                    grad.addColorStop(0.7, sparkColor);
                    grad.addColorStop(1, coreColor);
                    
                    ctx.save();
                    ctx.globalCompositeOperation = "screen";
                    ctx.strokeStyle = grad;
                    ctx.lineCap = "round";
                    
                    // 1. Draw Glow (GPU-Friendly Stroked Rounded Line)
                    ctx.lineWidth = this.size * 2.8;
                    ctx.globalAlpha = Math.max(0, Math.min(0.25 * flicker, 1));
                    ctx.beginPath();
                    ctx.moveTo(frontX, frontY);
                    ctx.lineTo(backX, backY);
                    ctx.stroke();
                    
                    // 2. Draw Core (GPU-Friendly Stroked Rounded Line)
                    ctx.lineWidth = this.size;
                    ctx.globalAlpha = Math.max(0, Math.min(flicker, 1));
                    ctx.beginPath();
                    ctx.moveTo(frontX, frontY);
                    ctx.lineTo(backX, backY);
                    ctx.stroke();
                    
                    ctx.restore();
                    return;
                }
                
                // --- SOLARIS EXCLUSIVE SPARK RENDERING ---
                if (isSolaris && this.type === "spark") {
                    const life = Math.max(0, Math.min(this.alpha / this.initialAlpha, 1));
                    let sparkColor;
                    
                    if (life > 0.6) {
                        sparkColor = `rgba(251, 191, 36, ${this.alpha})`;
                    } else if (life > 0.25) {
                        sparkColor = `rgba(249, 115, 22, ${this.alpha})`;
                    } else {
                        sparkColor = `rgba(239, 68, 68, ${this.alpha})`;
                    }
                    
                    const flicker = Math.sin(this.wobble * 3.5) * 0.15 + 0.85;
                    const blurLength = 3.5;
                    const x2 = this.x - this.vx * blurLength;
                    const y2 = this.y - this.vy * blurLength;
                    
                    ctx.save();
                    ctx.globalCompositeOperation = "screen";
                    ctx.strokeStyle = sparkColor;
                    ctx.lineCap = "round";
                    
                    // 1. Translucent outer glow
                    ctx.lineWidth = this.size * 2.8;
                    ctx.globalAlpha = Math.max(0, Math.min(this.alpha * flicker * 0.25, 1));
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    
                    // 2. White-Hot inner core
                    ctx.lineWidth = this.size;
                    ctx.globalAlpha = Math.max(0, Math.min(this.alpha * flicker, 1));
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    ctx.restore();
                    return;
                }

                // --- STANDARD / OTHER THEMES SPARK RENDERING ---
                const flicker = Math.sin(this.wobble * 2.5) * 0.18 + 0.82;
                
                // Motion blur length based on velocity vector
                const blurLength = 3.0; // capsule stretch factor
                const x2 = this.x - this.vx * blurLength;
                const y2 = this.y - this.vy * blurLength;
                
                ctx.strokeStyle = this.color;
                ctx.lineCap = "round";
                
                // 1. Draw Outer Glow (larger, translucent capsule)
                ctx.lineWidth = this.size * 2.5;
                ctx.globalAlpha = Math.max(0, Math.min(this.alpha * flicker * 0.20, 1));
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                
                // 2. Draw Inner Core (crisp, solid capsule)
                ctx.lineWidth = this.size;
                ctx.globalAlpha = Math.max(0, Math.min(this.alpha * flicker, 1));
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
        
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();
        
        function getThemeColors() {
            const theme = document.documentElement.className;
            
            // Bulletproof hardcoded color registry to prevent CSS race conditions during navigation
            if (theme.includes("theme-retro-emerald")) {
                return ['#166e7a', '#52c33f', '#fcf660']; // Teal, Leaf Green, Bright Yellow
            } else if (theme.includes("theme-retro-dusk")) {
                return ['#745a6c', '#c8b195', '#fbe6d4']; // Muted purple, sandy tan, peach/cream (twinkling stars)
            } else if (theme.includes("theme-autumn-mint")) {
                return ['#df7f58', '#b5e2b9', '#5f3e53'];
            } else if (theme.includes("theme-cyberpunk")) {
                return ['#f43f5e', '#10b981', '#d946ef'];
            } else if (theme.includes("theme-solaris")) {
                return ['#f59e0b', '#ef4444', '#f97316'];
            } else if (theme.includes("theme-midnight-blaze")) {
                return ['#ff8b72', '#d94165', '#8c2543']; // Salmon-Peach, Plum-Rose, Burgundy
            } else if (theme.includes("theme-glacial-glass")) {
                return ['#eaf0ff', '#9fb3e8', '#7c91cc']; // Icy White, Soft Lavender, Cool Periwinkle
            } else if (theme.includes("theme-aetheria")) {
                return ['#a855f7', '#06b6d4'];
            }
            
            // Runtime dynamic fallback
            const style = getComputedStyle(document.documentElement);
            const primary = style.getPropertyValue('--accent-purple').trim() || '#a855f7';
            const secondary = style.getPropertyValue('--accent-cyan').trim() || '#06b6d4';
            const tertiary = style.getPropertyValue('--accent-pink').trim();
            const colors = [primary, secondary];
            if (tertiary) {
                colors.push(tertiary);
            }
            return colors;
        }
        
        let lastThemeClass = "";
        window.updateEmberColors = function () {
            themeColors = getThemeColors();
            
            const currentTheme = document.documentElement.className;
            const themeChanged = lastThemeClass !== currentTheme;
            lastThemeClass = currentTheme;
            
            const isSolaris = currentTheme.includes("theme-solaris");
            const isMidnightBlaze = currentTheme.includes("theme-midnight-blaze");
            const isGlacialGlass = currentTheme.includes("theme-glacial-glass");
            const targetCount = isGlacialGlass ? 0 : (isMidnightBlaze ? 260 : (isSolaris ? 135 : 65));
            
            if (particles.length < targetCount) {
                while (particles.length < targetCount) {
                    const p = new EmberParticle();
                    // Let constructor's reset(true) handle initial states!
                    particles.push(p);
                }
            } else if (particles.length > targetCount) {
                // Safely shrink array without losing object reference
                particles.splice(targetCount);
            }
            
            // If the theme changed, force a full reset of all particles with initial=true
            // so they immediately adapt to new physics, spawn off-screen or in position, and stagger starting delays.
            if (themeChanged) {
                particles.forEach(p => {
                    p.reset(true);
                    p.color = themeColors[Math.floor(Math.random() * themeColors.length)] || '#a855f7';
                });
            } else {
                // Otherwise, just update colors of existing active particles
                particles.forEach(p => {
                    p.color = themeColors[Math.floor(Math.random() * themeColors.length)] || '#a855f7';
                    if ((isSolaris || isMidnightBlaze || isGlacialGlass) && p.type !== "plume" && p.type !== "spark") {
                        p.reset(false);
                    } else if (!isSolaris && !isMidnightBlaze && !isGlacialGlass) {
                        p.type = "spark";
                    }
                });
            }
        };
        
        // Fluid morphing wave fire bed at the bottom of the viewport (Exclusive to Solaris Gold Theme!)
        function drawSolarisFireBed(ctx, width, height, time) {
            const isSolaris = document.documentElement.className.includes("theme-solaris");
            if (!isSolaris) return;
            
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            
            // Draw slightly below the bottom edge (height + 40) so the bottom is 100% solid
            const bottomMargin = height + 40;
            
            // Go far past width * 1.1 + 100 to guarantee waves never clip or slant on the right edge!
            const renderLimit = width * 1.1 + 100;
            
            // 1. Deep Crimson Red back wave (slow, tall, organic, doubled height, soft feathered edges!)
            const grad1 = ctx.createLinearGradient(0, height - 200, 0, bottomMargin);
            grad1.addColorStop(0, "rgba(239, 68, 68, 0)"); // transparent top
            grad1.addColorStop(0.35, "rgba(239, 68, 68, 0.08)"); // smooth blend
            grad1.addColorStop(1, "rgba(239, 68, 68, 0.16)"); // base
            
            ctx.fillStyle = grad1;
            ctx.beginPath();
            ctx.moveTo(0, bottomMargin);
            for (let x = 0; x <= renderLimit; x += 30) {
                const yOffset = Math.sin(x * 0.004 + time * 0.015) * 45 + Math.cos(x * 0.007 + time * 0.02) * 25;
                const waveHeight = height - 200 + yOffset;
                ctx.lineTo(x, waveHeight);
            }
            ctx.lineTo(width, bottomMargin);
            ctx.closePath();
            ctx.fill();
            
            // 2. Sunburst Orange middle wave (medium speed, medium height)
            const grad2 = ctx.createLinearGradient(0, height - 140, 0, bottomMargin);
            grad2.addColorStop(0, "rgba(249, 115, 22, 0)");
            grad2.addColorStop(0.35, "rgba(249, 115, 22, 0.11)");
            grad2.addColorStop(1, "rgba(249, 115, 22, 0.22)");
            
            ctx.fillStyle = grad2;
            ctx.beginPath();
            ctx.moveTo(0, bottomMargin);
            for (let x = 0; x <= renderLimit; x += 30) {
                const yOffset = Math.cos(x * 0.006 - time * 0.02) * 35 + Math.sin(x * 0.01 + time * 0.015) * 18;
                const waveHeight = height - 140 + yOffset;
                ctx.lineTo(x, waveHeight);
            }
            ctx.lineTo(width, bottomMargin);
            ctx.closePath();
            ctx.fill();
            
            // 3. Amber Gold front wave (fast, low, sparkling)
            const grad3 = ctx.createLinearGradient(0, height - 90, 0, bottomMargin);
            grad3.addColorStop(0, "rgba(245, 158, 11, 0)");
            grad3.addColorStop(0.35, "rgba(245, 158, 11, 0.15)");
            grad3.addColorStop(1, "rgba(245, 158, 11, 0.30)");
            
            ctx.fillStyle = grad3;
            ctx.beginPath();
            ctx.moveTo(0, bottomMargin);
            for (let x = 0; x <= renderLimit; x += 30) {
                const yOffset = Math.sin(x * 0.008 + time * 0.035) * 22 + Math.cos(x * 0.012 - time * 0.02) * 12;
                const waveHeight = height - 90 + yOffset;
                ctx.lineTo(x, waveHeight);
            }
            ctx.lineTo(width, bottomMargin);
            ctx.closePath();
            ctx.fill();
            
            // 4. White-Hot Golden Core wave (hyper fast, hugging the bottom)
            const grad4 = ctx.createLinearGradient(0, height - 40, 0, bottomMargin);
            grad4.addColorStop(0, "rgba(254, 240, 138, 0)");
            grad4.addColorStop(0.35, "rgba(254, 240, 138, 0.18)");
            grad4.addColorStop(1, "rgba(254, 240, 138, 0.36)");
            
            ctx.fillStyle = grad4;
            ctx.beginPath();
            ctx.moveTo(0, bottomMargin);
            for (let x = 0; x <= renderLimit; x += 40) {
                const yOffset = Math.cos(x * 0.015 + time * 0.045) * 10 + Math.sin(x * 0.02 - time * 0.03) * 5;
                const waveHeight = height - 40 + yOffset;
                ctx.lineTo(x, waveHeight);
            }
            ctx.lineTo(width, bottomMargin);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
        
        // Symmetrical floating wave ribbons in the vertical center of screen (Exclusive to Midnight Blaze!)
        function drawMidnightBlazeRibbon(ctx, width, height, time) {
            const isMidnightBlaze = document.documentElement.className.includes("theme-midnight-blaze");
            if (!isMidnightBlaze) return;
            
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            
            const midY = height / 2;
            const renderLimit = width * 1.1 + 100;
            
            // Ribbon 1 (Deep Crimson Burgundy background ribbon - tall, slow)
            const grad1 = ctx.createLinearGradient(0, midY - 140, 0, midY + 140);
            grad1.addColorStop(0, "rgba(140, 37, 67, 0)"); // transparent top
            grad1.addColorStop(0.35, "rgba(140, 37, 67, 0.08)");
            grad1.addColorStop(0.5, "rgba(140, 37, 67, 0.16)"); // solid center
            grad1.addColorStop(0.65, "rgba(140, 37, 67, 0.08)");
            grad1.addColorStop(1, "rgba(140, 37, 67, 0)"); // transparent bottom
            
            ctx.fillStyle = grad1;
            ctx.beginPath();
            ctx.moveTo(0, midY);
            // Sweep top curve from left to right (optimized with step size 55)
            for (let x = 0; x <= renderLimit; x += 55) {
                const yOffset = Math.sin(x * 0.003 + time * 0.015) * 45 + Math.cos(x * 0.006 + time * 0.02) * 20;
                ctx.lineTo(x, midY - 120 + yOffset);
            }
            ctx.lineTo(renderLimit, midY + 120);
            // Sweep bottom curve from right to left (optimized with step size 55)
            for (let x = renderLimit; x >= 0; x -= 55) {
                const yOffset = Math.cos(x * 0.004 - time * 0.018) * 32 + Math.sin(x * 0.008 + time * 0.01) * 15;
                ctx.lineTo(x, midY + 120 + yOffset);
            }
            ctx.closePath();
            ctx.fill();
            
            // Ribbon 2 (Midnight Plum/Rose - medium speed, medium height)
            const grad2 = ctx.createLinearGradient(0, midY - 95, 0, midY + 95);
            grad2.addColorStop(0, "rgba(217, 65, 101, 0)");
            grad2.addColorStop(0.35, "rgba(217, 65, 101, 0.10)");
            grad2.addColorStop(0.5, "rgba(217, 65, 101, 0.20)");
            grad2.addColorStop(0.65, "rgba(217, 65, 101, 0.10)");
            grad2.addColorStop(1, "rgba(217, 65, 101, 0)");
            
            ctx.fillStyle = grad2;
            ctx.beginPath();
            ctx.moveTo(0, midY);
            for (let x = 0; x <= renderLimit; x += 55) {
                const yOffset = Math.cos(x * 0.005 - time * 0.02) * 35 + Math.sin(x * 0.009 + time * 0.015) * 15;
                ctx.lineTo(x, midY - 80 + yOffset);
            }
            ctx.lineTo(renderLimit, midY + 80);
            for (let x = renderLimit; x >= 0; x -= 55) {
                const yOffset = Math.sin(x * 0.006 + time * 0.022) * 25 + Math.cos(x * 0.01 - time * 0.012) * 10;
                ctx.lineTo(x, midY + 80 + yOffset);
            }
            ctx.closePath();
            ctx.fill();
            
            // Ribbon 3 (Peach/Salmon - fast, low, bright)
            const grad3 = ctx.createLinearGradient(0, midY - 60, 0, midY + 60);
            grad3.addColorStop(0, "rgba(255, 139, 114, 0)");
            grad3.addColorStop(0.35, "rgba(255, 139, 114, 0.13)");
            grad3.addColorStop(0.5, "rgba(255, 139, 114, 0.26)");
            grad3.addColorStop(0.65, "rgba(255, 139, 114, 0.13)");
            grad3.addColorStop(1, "rgba(255, 139, 114, 0)");
            
            ctx.fillStyle = grad3;
            ctx.beginPath();
            ctx.moveTo(0, midY);
            for (let x = 0; x <= renderLimit; x += 55) {
                const yOffset = Math.sin(x * 0.007 + time * 0.03) * 22 + Math.cos(x * 0.011 - time * 0.018) * 10;
                ctx.lineTo(x, midY - 50 + yOffset);
            }
            ctx.lineTo(renderLimit, midY + 50);
            for (let x = renderLimit; x >= 0; x -= 55) {
                const yOffset = Math.cos(x * 0.008 - time * 0.028) * 16 + Math.sin(x * 0.013 + time * 0.015) * 8;
                ctx.lineTo(x, midY + 50 + yOffset);
            }
            ctx.closePath();
            ctx.fill();
            
            // Ribbon 4 (White-Hot Coral Core - bright, central energy filament)
            const grad4 = ctx.createLinearGradient(0, midY - 30, 0, midY + 30);
            grad4.addColorStop(0, "rgba(255, 228, 223, 0)");
            grad4.addColorStop(0.35, "rgba(255, 228, 223, 0.17)");
            grad4.addColorStop(0.5, "rgba(255, 228, 223, 0.34)");
            grad4.addColorStop(0.65, "rgba(255, 228, 223, 0.17)");
            grad4.addColorStop(1, "rgba(255, 228, 223, 0)");
            
            ctx.fillStyle = grad4;
            ctx.beginPath();
            ctx.moveTo(0, midY);
            for (let x = 0; x <= renderLimit; x += 55) {
                const yOffset = Math.cos(x * 0.012 + time * 0.04) * 10 + Math.sin(x * 0.018 - time * 0.025) * 5;
                const waveHeight = midY - 20 + yOffset;
                ctx.lineTo(x, waveHeight);
            }
            ctx.lineTo(renderLimit, midY + 20);
            for (let x = renderLimit; x >= 0; x -= 55) {
                const yOffset = Math.sin(x * 0.015 - time * 0.035) * 8 + Math.cos(x * 0.022 + time * 0.02) * 4;
                const waveHeight = midY + 20 + yOffset;
                ctx.lineTo(x, waveHeight);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
        
        // Initial setup
        window.updateEmberColors();
        
        let wasGlacialGlass = false;
        let fireTime = 0;
        
        function animate() {
            const isGlacialGlass = document.documentElement.className.includes("theme-glacial-glass");
            if (isGlacialGlass) {
                if (!wasGlacialGlass) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    wasGlacialGlass = true;
                }
                requestAnimationFrame(animate);
                return;
            }
            wasGlacialGlass = false;
            
            fireTime += 1;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const isRetro = document.documentElement.className.includes("theme-retro");
            // Screen blending mode for glowing embers, normal source-over blending for pixelated arcade blocks
            ctx.globalCompositeOperation = isRetro ? "source-over" : "screen";
            
            const isSolaris = document.documentElement.className.includes("theme-solaris");
            const isMidnightBlaze = document.documentElement.className.includes("theme-midnight-blaze");
            
            // Draw ambient pulsing fireplace hearth glow at the bottom center (Exclusive to Solaris!)
            if (isSolaris) {
                const glowPulse = Math.sin(fireTime * 0.015) * 0.07 + 0.21; // pulses between 0.14 and 0.28
                const gradient = ctx.createRadialGradient(
                    canvas.width / 2, canvas.height, 10,
                    canvas.width / 2, canvas.height, canvas.height * 0.75
                );
                gradient.addColorStop(0, `rgba(249, 115, 22, ${glowPulse * 0.55})`); // orange core
                gradient.addColorStop(0.4, `rgba(239, 68, 68, ${glowPulse * 0.22})`); // crimson aura
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.save();
                ctx.globalCompositeOperation = "screen";
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
            
            // Draw fluid morphing wave fire bed at the bottom of the screen under Solaris Gold
            drawSolarisFireBed(ctx, canvas.width, canvas.height, fireTime);
            
            // Symmetrical floating frosted-glass ribbons in the vertical center of screen (Exclusive to Glacial Glass!)
            function drawGlacialGlassRibbon(ctx, width, height, time) {
                const isGlacialGlass = document.documentElement.className.includes("theme-glacial-glass");
                if (!isGlacialGlass) return;
                
                ctx.save();
                ctx.globalCompositeOperation = "screen";
                
                const midY = height / 2;
                const renderLimit = width * 1.1 + 100;
                
                // Ribbon 1 (Deep Navy Slate Glass background - tall, slow)
                const grad1 = ctx.createLinearGradient(0, midY - 140, 0, midY + 140);
                grad1.addColorStop(0, "rgba(29, 40, 63, 0)"); // transparent top
                grad1.addColorStop(0.35, "rgba(29, 40, 63, 0.08)");
                grad1.addColorStop(0.5, "rgba(29, 40, 63, 0.16)"); // solid center
                grad1.addColorStop(0.65, "rgba(29, 40, 63, 0.08)");
                grad1.addColorStop(1, "rgba(29, 40, 63, 0)"); // transparent bottom
                
                ctx.fillStyle = grad1;
                ctx.beginPath();
                ctx.moveTo(0, midY);
                // Sweep top curve from left to right (optimized with step size 55)
                for (let x = 0; x <= renderLimit; x += 55) {
                    const yOffset = Math.sin(x * 0.003 - time * 0.012) * 40 + Math.cos(x * 0.006 + time * 0.015) * 18;
                    ctx.lineTo(x, midY - 120 + yOffset);
                }
                ctx.lineTo(renderLimit, midY + 120);
                // Sweep bottom curve from right to left (optimized with step size 55)
                for (let x = renderLimit; x >= 0; x -= 55) {
                    const yOffset = Math.cos(x * 0.004 + time * 0.014) * 28 + Math.sin(x * 0.008 - time * 0.008) * 12;
                    ctx.lineTo(x, midY + 120 + yOffset);
                }
                ctx.closePath();
                ctx.fill();
                
                // Ribbon 2 (Cool Periwinkle Glass - medium speed, medium height)
                const grad2 = ctx.createLinearGradient(0, midY - 95, 0, midY + 95);
                grad2.addColorStop(0, "rgba(124, 145, 204, 0)");
                grad2.addColorStop(0.35, "rgba(124, 145, 204, 0.09)");
                grad2.addColorStop(0.5, "rgba(124, 145, 204, 0.18)");
                grad2.addColorStop(0.65, "rgba(124, 145, 204, 0.09)");
                grad2.addColorStop(1, "rgba(124, 145, 204, 0)");
                
                ctx.fillStyle = grad2;
                ctx.beginPath();
                ctx.moveTo(0, midY);
                for (let x = 0; x <= renderLimit; x += 55) {
                    const yOffset = Math.cos(x * 0.005 + time * 0.016) * 30 + Math.sin(x * 0.009 - time * 0.012) * 12;
                    ctx.lineTo(x, midY - 80 + yOffset);
                }
                ctx.lineTo(renderLimit, midY + 80);
                for (let x = renderLimit; x >= 0; x -= 55) {
                    const yOffset = Math.sin(x * 0.006 - time * 0.018) * 22 + Math.cos(x * 0.01 + time * 0.01) * 8;
                    ctx.lineTo(x, midY + 80 + yOffset);
                }
                ctx.closePath();
                ctx.fill();
                
                // Ribbon 3 (Soft Lavender Glass - fast, low, bright)
                const grad3 = ctx.createLinearGradient(0, midY - 60, 0, midY + 60);
                grad3.addColorStop(0, "rgba(159, 179, 232, 0)");
                grad3.addColorStop(0.35, "rgba(159, 179, 232, 0.11)");
                grad3.addColorStop(0.5, "rgba(159, 179, 232, 0.22)");
                grad3.addColorStop(0.65, "rgba(159, 179, 232, 0.11)");
                grad3.addColorStop(1, "rgba(159, 179, 232, 0)");
                
                ctx.fillStyle = grad3;
                ctx.beginPath();
                ctx.moveTo(0, midY);
                for (let x = 0; x <= renderLimit; x += 55) {
                    const yOffset = Math.sin(x * 0.007 - time * 0.024) * 18 + Math.cos(x * 0.011 + time * 0.015) * 8;
                    ctx.lineTo(x, midY - 50 + yOffset);
                }
                ctx.lineTo(renderLimit, midY + 50);
                for (let x = renderLimit; x >= 0; x -= 55) {
                    const yOffset = Math.cos(x * 0.008 + time * 0.022) * 14 + Math.sin(x * 0.013 - time * 0.012) * 6;
                    ctx.lineTo(x, midY + 50 + yOffset);
                }
                ctx.closePath();
                ctx.fill();
                
                // Ribbon 4 (Frosty Ice Core - bright, central energy filament)
                const grad4 = ctx.createLinearGradient(0, midY - 30, 0, midY + 30);
                grad4.addColorStop(0, "rgba(234, 240, 255, 0)");
                grad4.addColorStop(0.35, "rgba(234, 240, 255, 0.15)");
                grad4.addColorStop(0.5, "rgba(234, 240, 255, 0.30)");
                grad4.addColorStop(0.65, "rgba(234, 240, 255, 0.15)");
                grad4.addColorStop(1, "rgba(234, 240, 255, 0)");
                
                ctx.fillStyle = grad4;
                ctx.beginPath();
                ctx.moveTo(0, midY);
                for (let x = 0; x <= renderLimit; x += 55) {
                    const yOffset = Math.cos(x * 0.012 - time * 0.03) * 8 + Math.sin(x * 0.018 + time * 0.02) * 4;
                    const waveHeight = midY - 20 + yOffset;
                    ctx.lineTo(x, waveHeight);
                }
                ctx.lineTo(renderLimit, midY + 20);
                for (let x = renderLimit; x >= 0; x -= 55) {
                    const yOffset = Math.sin(x * 0.015 + time * 0.026) * 6 + Math.cos(x * 0.022 - time * 0.015) * 3;
                    const waveHeight = midY + 20 + yOffset;
                    ctx.lineTo(x, waveHeight);
                }
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
            }
            
            // Draw floating Midnight Blaze ribbon waves in the middle of the screen
            drawMidnightBlazeRibbon(ctx, canvas.width, canvas.height, fireTime);
            
            // Draw floating Glacial Glass ribbon waves in the middle of the screen
            drawGlacialGlassRibbon(ctx, canvas.width, canvas.height, fireTime);
            
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
            }
            
            requestAnimationFrame(animate);
        }
        
        // Run animation
        animate();
    });
})();
