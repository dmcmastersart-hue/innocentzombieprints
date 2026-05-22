// InnocentZombie Theme Controller
(function () {
    // 1. Try to load from URL parameters first (highly robust for local file:/// preview navigations)
    let theme = null;
    try {
        const params = new URLSearchParams(window.location.search);
        theme = params.get("theme");
    } catch (e) {}

    // 2. Fallback to localStorage
    if (!theme) {
        try {
            theme = localStorage.getItem("theme");
        } catch (e) {}
    }

    // 3. Ultimate default fallback
    if (!theme) {
        theme = "theme-aetheria";
    }

    // 4. Synchronize back to localStorage
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
        
        // Find the active theme class from HTML root
        const activeTheme = Array.from(document.documentElement.classList)
            .concat(document.documentElement.className.split(" "))
            .find(c => c.startsWith("theme-")) || "theme-aetheria";
            
        // Append query parameter safely to propagate active theme across page loads
        try {
            const base = window.location.origin || (window.location.protocol + "//" + window.location.host);
            const url = new URL(href, window.location.protocol === "file:" ? "file:///" : base);
            url.searchParams.set("theme", activeTheme);
            href = href.includes("#") 
                ? href.split("#")[0].split("?")[0] + url.search + "#" + href.split("#")[1]
                : href.split("?")[0] + url.search;
        } catch (err) {
            if (href.includes("?")) {
                href = href.replace(/\?/, `?theme=${activeTheme}&`);
            } else if (href.includes("#")) {
                const parts = href.split("#");
                href = `${parts[0]}?theme=${activeTheme}#${parts[1]}`;
            } else {
                href = `${href}?theme=${activeTheme}`;
            }
        }
        
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
                        
                        <div class="theme-opt-card" data-theme-class="theme-retro">
                            <div class="theme-opt-preview retro-prev">
                                <span style="background-color: #080810;"></span>
                                <span style="background-color: #ef3a0f;"></span>
                                <span style="background-color: #00f0f0;"></span>
                            </div>
                            <span class="theme-opt-name">8-Bit Retro NES</span>
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
        const currentTheme = localStorage.getItem("theme") || "theme-aetheria";
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
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.zIndex = "-1";
        canvas.style.pointerEvents = "none";
        canvas.style.display = "block";
        
        // Insert as first child of body to stay behind all other content
        document.body.insertBefore(canvas, document.body.firstChild);
        
        const ctx = canvas.getContext("2d");
        let particles = [];
        let themeColors = [];
        
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
            } else if (theme.includes("theme-retro")) {
                return ['#ef3a0f', '#00f0f0', '#f8b800']; // NES Red, NES Cyan, NES Gold
            } else if (theme.includes("theme-autumn-mint")) {
                return ['#df7f58', '#b5e2b9', '#5f3e53'];
            } else if (theme.includes("theme-cyberpunk")) {
                return ['#f43f5e', '#10b981', '#d946ef'];
            } else if (theme.includes("theme-solaris")) {
                return ['#f59e0b', '#ef4444', '#f97316'];
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
        
        window.updateEmberColors = function () {
            themeColors = getThemeColors();
            // Instantly update colors of existing active particles
            particles.forEach(p => {
                p.color = themeColors[Math.floor(Math.random() * themeColors.length)];
            });
        };
        
        // Initial setup
        window.updateEmberColors();
        
        class EmberParticle {
            constructor() {
                this.reset(true);
            }
            
            reset(initial = false) {
                this.x = Math.random() * canvas.width;
                this.y = initial ? Math.random() * canvas.height : canvas.height + Math.random() * 20;
                this.size = Math.random() * 2.2 + 0.6; // Discrete small size (0.6px to 2.8px)
                this.vy = -(Math.random() * 0.6 + 0.25); // Slow upwards movement
                this.vx = Math.random() * 0.25 - 0.125; // Slow horizontal drift
                this.alpha = Math.random() * 0.5 + 0.3; // Gentle initial opacity
                
                // Calculate decay dynamically so average particles reach ~75% of screen height
                const targetTravel = canvas.height * (Math.random() * 0.5 + 0.5); // travels 50% to 100% of screen height
                const framesNeeded = targetTravel / Math.abs(this.vy);
                this.decay = this.alpha / framesNeeded;
                
                this.color = themeColors[Math.floor(Math.random() * themeColors.length)];
                this.wobble = Math.random() * Math.PI * 2;
                this.wobbleSpeed = Math.random() * 0.015 + 0.005;
            }
            
            update() {
                this.y += this.vy;
                this.wobble += this.wobbleSpeed;
                this.x += this.vx + Math.sin(this.wobble) * 0.12;
                this.alpha -= this.decay;
                
                if (this.alpha <= 0 || this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
                    this.reset(false);
                }
            }
            
            draw() {
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

                // Gentle flicker oscillation using sine wave
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
        
        // Spawn particles (around 65 particles for high-performance and subtle elegance)
        const maxParticles = 65;
        for (let i = 0; i < maxParticles; i++) {
            particles.push(new EmberParticle());
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const isRetro = document.documentElement.className.includes("theme-retro");
            // Screen blending mode for glowing embers, normal source-over blending for pixelated arcade blocks
            ctx.globalCompositeOperation = isRetro ? "source-over" : "screen";
            
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
