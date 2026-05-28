// InnocentZombie Catalog Controller

// Universal high-performance IndexedDB Image Caching Engine
const ImageCache = (function () {
    const DB_NAME = "ModelImageCache";
    const DB_VERSION = 1;
    const STORE_NAME = "images";
    let db = null;

    function initDB() {
        return new Promise((resolve, reject) => {
            if (db) return resolve(db);
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = (e) => reject(e.target.error);
            request.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };
            request.onupgradeneeded = (e) => {
                const activeDb = e.target.result;
                if (!activeDb.objectStoreNames.contains(STORE_NAME)) {
                    activeDb.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    async function getCachedBlob(url) {
        try {
            const activeDb = await initDB();
            return new Promise((resolve, reject) => {
                const transaction = activeDb.transaction(STORE_NAME, "readonly");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(url);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (err) {
            return null;
        }
    }

    async function storeBlob(url, blob) {
        try {
            const activeDb = await initDB();
            return new Promise((resolve, reject) => {
                const transaction = activeDb.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(blob, url);
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (err) {}
    }

    async function loadWithCache(imgElement, originalUrl) {
        if (!originalUrl) return;
        imgElement.classList.add("loading");

        // Try reading from IndexedDB cache
        const cachedBlob = await getCachedBlob(originalUrl);
        if (cachedBlob) {
            const blobUrl = URL.createObjectURL(cachedBlob);
            imgElement.src = blobUrl;
            
            // Clean up Object URL to prevent memory leaks
            imgElement.addEventListener("load", function revoke() {
                imgElement.removeEventListener("load", revoke);
                URL.revokeObjectURL(blobUrl);
            });
            imgElement.classList.remove("loading");
            return;
        }

        // Cache Miss: Fetch & Cache
        try {
            const response = await fetch(originalUrl, { mode: 'cors' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();
            await storeBlob(originalUrl, blob);

            const blobUrl = URL.createObjectURL(blob);
            imgElement.src = blobUrl;

            imgElement.addEventListener("load", function revoke() {
                imgElement.removeEventListener("load", revoke);
                URL.revokeObjectURL(blobUrl);
            });
            imgElement.classList.remove("loading");
        } catch (err) {
            // Safe Fallback (offline or CORS blocked)
            imgElement.src = originalUrl;
            imgElement.classList.remove("loading");
        }
    }

    return { loadWithCache };
})();

document.addEventListener("DOMContentLoaded", () => {
    // State management variables
    let allModels = [];
    let filteredModels = [];
    let activeFilters = {
        search: "",
        creator: "all",
        type: "all",
        category: "all",
        nsfw: false // NSFW toggle default off
    };
    
    let currentPage = 1;
    const ITEMS_PER_PAGE = 24;

    // DOM Elements Cache
    const searchInput = document.getElementById("catalog-search");
    const statsCounter = document.getElementById("stats-counter");
    const creatorPills = document.getElementById("creator-pills");
    const typePills = document.getElementById("type-pills");
    const categoryPills = document.getElementById("category-pills");
    const catalogGrid = document.getElementById("catalog-grid");
    const loadMoreBtn = document.getElementById("load-more-btn");
    const loadMoreWrapper = document.getElementById("load-more-wrapper");
    
    // Modal Elements
    const detailModal = document.getElementById("detail-modal");
    const modalClose = document.getElementById("modal-close");
    const modalImage = document.getElementById("modal-image");
    const modalCreator = document.getElementById("modal-creator");
    const modalTitle = document.getElementById("modal-title");
    const modalCategory = document.getElementById("modal-category");
    const modalRank = document.getElementById("modal-rank");
    const modalDownloads = document.getElementById("modal-downloads");

    // Initialize - Fetch JSON data or load from window.catalogData (CORS-friendly local preview)
    const initDatabase = () => {
        if (window.catalogData && Array.isArray(window.catalogData)) {
            allModels = window.catalogData;
            filteredModels = [...allModels];
            buildCategoriesFilter();
            buildCreatorFilter();
            applyFiltersAndRender();
        } else {
            // Fallback for standard environments
            fetch("data.json")
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Unable to fetch catalog JSON data file");
                    }
                    return response.json();
                })
                .then(data => {
                    allModels = data;
                    filteredModels = [...allModels];
                    buildCategoriesFilter();
                    applyFiltersAndRender();
                })
                .catch(err => {
                    console.error("Database initialization failed:", err);
                    statsCounter.innerHTML = "Error loading database";
                    catalogGrid.innerHTML = `
                        <div class="no-results">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            <h3 class="no-results-title">Failed to load catalog</h3>
                            <p class="no-results-text">Please ensure data.js or data.json is present by running the update utilities.</p>
                        </div>
                    `;
                });
        }
    };

    initDatabase();

    // Build Category pills dynamically based on active categories in database
    function buildCategoriesFilter() {
        const categories = new Set();
        allModels.forEach(model => {
            if (model.category && model.category !== "Other") {
                categories.add(model.category);
            }
        });
        
        // Sort categories alphabetically
        const sortedCategories = Array.from(categories).sort();
        
        // Append dynamic categories to DOM
        sortedCategories.forEach(cat => {
            const pill = document.createElement("div");
            pill.className = "filter-pill";
            pill.setAttribute("data-category", cat);
            pill.innerText = cat;
            categoryPills.appendChild(pill);
        });

        // Add 'Other' to the very end if it exists in models
        const hasOther = allModels.some(m => m.category === "Other");
        if (hasOther) {
            const pill = document.createElement("div");
            pill.className = "filter-pill";
            pill.setAttribute("data-category", "Other");
            pill.innerText = "Other / Uncategorized";
            categoryPills.appendChild(pill);
        }
    }

    // Build Creator pills dynamically based on distinct creators in database
    function buildCreatorFilter() {
        // Clear any existing pills
        creatorPills.innerHTML = '';
        // All Creators pill
        const allPill = document.createElement('div');
        allPill.className = 'filter-pill active';
        allPill.setAttribute('data-creator', 'all');
        allPill.innerText = 'All Creators';
        creatorPills.appendChild(allPill);
        // Collect unique creators
        const creators = new Set();
        allModels.forEach(m => {
            if (m.creator) creators.add(m.creator);
        });
        const sortedCreators = Array.from(creators).sort();
        sortedCreators.forEach(cr => {
            const pill = document.createElement('div');
            pill.className = 'filter-pill filter-pill-creator';
            pill.setAttribute('data-creator', cr);
            pill.innerText = cr;
            creatorPills.appendChild(pill);
        });
    }

    // Bind Filter & Search Events
    searchInput.addEventListener("input", (e) => {
        activeFilters.search = e.target.value.toLowerCase().trim();
        applyFiltersAndRender();
    });

    // Handle filter pills clicks
    bindPillGroup(creatorPills, "creator");
    bindPillGroup(typePills, "type");
    bindPillGroup(categoryPills, "category");
    // NSFW toggle event listener
    const nsfwToggle = document.getElementById("nsfw-toggle");
    if (nsfwToggle) {
        nsfwToggle.addEventListener("change", (e) => {
            activeFilters.nsfw = e.target.checked;
            applyFiltersAndRender();
        });
    }

    function bindPillGroup(container, filterKey) {
        container.addEventListener("click", (e) => {
            const pill = e.target.closest(".filter-pill");
            if (!pill) return;

            // Remove active from peers
            container.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
            
            // Set clicked active
            pill.classList.add("active");

            // Update state
            activeFilters[filterKey] = pill.getAttribute(`data-${filterKey}`);
            
            applyFiltersAndRender();
        });
    }

    // Main Filtering logic
    function applyFiltersAndRender() {
        filteredModels = allModels.filter(model => {
            // 1. Search Query filter (matches Name, Category, or Creator)
            if (activeFilters.search) {
                const nameMatch = model.name && model.name.toLowerCase().includes(activeFilters.search);
                const catMatch = model.category && model.category.toLowerCase().includes(activeFilters.search);
                const creatorMatch = model.creator && model.creator.toLowerCase().includes(activeFilters.search);
                if (!nameMatch && !catMatch && !creatorMatch) return false;
            }

            // 2. Creator filter
            if (activeFilters.creator !== "all" && model.creator !== activeFilters.creator) {
                return false;
            }

            // 3. Category filter
            if (activeFilters.category !== "all" && model.category !== activeFilters.category) {
                return false;
            }

            // 4. Model Type variant filter
            if (activeFilters.type !== "all") {
                if (activeFilters.type === "bust" && !model.bust_url) return false;
                if (activeFilters.type === "spicy" && !model.spicy_url) return false;
                if (activeFilters.type === "standard" && (model.bust_url || model.spicy_url)) return false;
            }
            // NSFW toggle filter: hide spicy models when toggle is off
            if (!activeFilters.nsfw && model.spicy_url) return false;

            return true;
        });

        // Reset page pointer
        currentPage = 1;
        
        // Update Counter Display
        updateStats();

        // Clear grid and render
        catalogGrid.innerHTML = "";
        renderSlice();
    }

    function updateStats() {
        if (allModels.length === 0) {
            statsCounter.innerText = "Loading Models...";
            return;
        }
        
        if (filteredModels.length === allModels.length) {
            statsCounter.innerText = `Total Models: ${allModels.length}`;
        } else {
            statsCounter.innerText = `Showing ${filteredModels.length} of ${allModels.length}`;
        }
    }

    // Render current slice of catalog items
    function renderSlice() {
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIdx = startIdx + ITEMS_PER_PAGE;
        const slice = filteredModels.slice(startIdx, endIdx);

        if (slice.length === 0 && currentPage === 1) {
            // Check if there are models that were filtered out solely due to the NSFW toggle being off
            const hiddenByNsfw = allModels.some(model => {
                if (activeFilters.creator !== "all" && model.creator !== activeFilters.creator) return false;
                if (activeFilters.category !== "all" && model.category !== activeFilters.category) return false;
                if (activeFilters.search) {
                    const nameMatch = model.name && model.name.toLowerCase().includes(activeFilters.search);
                    const catMatch = model.category && model.category.toLowerCase().includes(activeFilters.search);
                    const creatorMatch = model.creator && model.creator.toLowerCase().includes(activeFilters.search);
                    if (!nameMatch && !catMatch && !creatorMatch) return false;
                }
                return !activeFilters.nsfw && model.spicy_url;
            });

            const extraText = hiddenByNsfw 
                ? `<p class="no-results-text" style="color: var(--accent-pink, #ec4899); font-weight: bold; margin-top: 0.75rem;">Note: Models exist for this filter but are currently hidden as NSFW. Toggle "Show NSFW Models" to reveal them!</p>`
                : "";

            catalogGrid.innerHTML = `
                <div class="no-results">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <h3 class="no-results-title">No models found</h3>
                    <p class="no-results-text">We couldn't find any designs matching your search criteria. Try adjusting your filters!</p>
                    ${extraText}
                </div>
            `;
            loadMoreWrapper.style.display = "none";
            return;
        }

        slice.forEach((model, index) => {
            const absoluteIndex = startIdx + index;
            const card = createModelCard(model, absoluteIndex);
            catalogGrid.appendChild(card);
        });

        // Toggle pagination button visibility
        if (endIdx >= filteredModels.length) {
            loadMoreWrapper.style.display = "none";
        } else {
            loadMoreWrapper.style.display = "flex";
        }
    }

    // Load More Button Event
    loadMoreBtn.addEventListener("click", () => {
        currentPage++;
        renderSlice();
    });
    // Back-to-top button logic
    const backToTopBtn = document.getElementById("back-to-top");
    if (backToTopBtn) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add("show");
            } else {
                backToTopBtn.classList.remove("show");
            }
        });
        backToTopBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // Helper: Create individual model card DOM element
    function createModelCard(model, idx) {
        const card = document.createElement("article");
        card.className = "model-card";
        card.setAttribute("data-index", idx);

        // Creator classification class
        let creatorClass = "badge-creator-generic";
        if (model.creator === "CA3D Studios") {
            creatorClass = "badge-creator-ca3d";
        } else if (model.creator === "Tanuki Figures" || model.creator === "Tanuki") {
            creatorClass = "badge-creator-tanuki";
        } else if (model.creator) {
            creatorClass = `badge-creator-${model.creator.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
        }
        
        // Check variants
        const hasBust = model.bust_url ? "active" : "";
        const hasSpicy = model.spicy_url ? "active" : "";
        const isStandardOnly = (!model.bust_url && !model.spicy_url) ? "active" : "";

        // Build HTML template
        card.innerHTML = `
            <div class="card-media-wrapper">
                <div class="card-badges">
                    <span class="badge ${creatorClass}">${model.creator}</span>
                    <span class="badge badge-category">${model.category || "Other"}</span>
                </div>
                ${
                    model.img_url 
                     ? `<img data-src="${model.img_url}" alt="${model.name}" class="card-image loading" loading="lazy">`
                     : `<div class="image-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        No Image Available
                       </div>`
                }
            </div>
            <div class="card-info">
                <h3 class="model-name">${model.name}</h3>
                <div class="variant-indicators">
                    <span class="indicator ${isStandardOnly}">Standard</span>
                    ${model.bust_url ? `<span class="indicator indicator-bust active">Bust</span>` : ""}
                    ${model.spicy_url ? `<span class="indicator indicator-spicy active">Spicy NSFW</span>` : ""}
                </div>
            </div>
        `;

        // Manage dynamic image caching & blur fade-in
        const img = card.querySelector(".card-image");
        if (img) {
            const originalUrl = img.getAttribute("data-src");
            
            img.onerror = () => {
                const parent = img.parentNode;
                parent.innerHTML = `
                    <div class="image-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Image Load Failed
                    </div>
                `;
            };

            ImageCache.loadWithCache(img, originalUrl);
        }

        // Open details on click
        card.addEventListener("click", () => openModelModal(model));

        return card;
    }

    // Modal Control: Populate and display overlay
    function openModelModal(model) {
        modalTitle.innerText = model.name;
        modalCreator.innerText = model.creator;
        
        // Add class styling based on creator dynamically
        let creatorTagClass = "tag-generic";
        if (model.creator === "CA3D Studios") {
            creatorTagClass = "tag-ca3d";
        } else if (model.creator === "Tanuki Figures" || model.creator === "Tanuki") {
            creatorTagClass = "tag-tanuki";
        } else if (model.creator) {
            creatorTagClass = `tag-${model.creator.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
        }
        modalCreator.className = "modal-creator-tag " + creatorTagClass;
        
        modalCategory.innerText = model.category || "Other";
        
        // Set Rank badge if available
        if (model.rank) {
            modalRank.innerText = `Rank: #${model.rank}`;
            modalRank.style.display = "inline-block";
        } else {
            modalRank.style.display = "none";
        }

        // Preview Image using IndexedDB cache
        if (model.img_url) {
            modalImage.style.display = "block";
            modalImage.classList.remove("modal-preview-blur");
            ImageCache.loadWithCache(modalImage, model.img_url);
        } else {
            modalImage.src = "";
            modalImage.style.display = "none";
        }

        // Rebuild download buttons
        modalDownloads.innerHTML = "";

        let hasDownloads = false;

        // 1. Standard Model link
        if (model.url) {
            hasDownloads = true;
            appendDownloadBtn(
                model.url, 
                "Standard Model", 
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M12 8v8M8 12h8"></path></svg>`
            );
        }

        // 2. Bust Model variant link
        if (model.bust_url) {
            hasDownloads = true;
            appendDownloadBtn(
                model.bust_url, 
                "Bust Version", 
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"></path><path d="M18 13c0 2.5-3 4-6 4s-6-1.5-6-4v7h12v-7z"></path></svg>`,
                "btn-variant-bust"
            );
        }

        // 3. Spicy Model variant link
        if (model.spicy_url) {
            hasDownloads = true;
            appendDownloadBtn(
                model.spicy_url, 
                "Spicy NSFW Version", 
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>`,
                "btn-variant-spicy"
            );
        }

        // Fallback: If no links are filled out in Excel, link directly to search or Etsy
        if (!hasDownloads) {
            const fallbackSearchUrl = `https://cults3d.com/en/creators/${model.creator === "CA3D Studios" ? "carlose" : "tanukifigures"}`;
            appendDownloadBtn(
                fallbackSearchUrl,
                `Search on ${model.creator}`,
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`
            );
        }

        // Show Modal
        detailModal.classList.add("active");
        document.body.style.overflow = "hidden"; // Prevent background scroll
    }

    function appendDownloadBtn(url, label, iconSvg, customClass = "") {
        const btn = document.createElement("a");
        btn.href = url;
        btn.target = "_blank";
        btn.className = `download-link-btn ${customClass}`;
        btn.innerHTML = `
            <span class="download-btn-label">
                ${iconSvg}
                ${label}
            </span>
            <span class="download-btn-arrow">&rarr;</span>
        `;
        modalDownloads.appendChild(btn);
    }

    // Modal Close operations
    function closeModal() {
        detailModal.classList.remove("active");
        document.body.style.overflow = ""; // Restore background scroll
        setTimeout(() => {
            modalImage.src = ""; // Clear image reference
        }, 300);
    }

    modalClose.addEventListener("click", closeModal);
    
    // Close modal on click outside the window card
    detailModal.addEventListener("click", (e) => {
        if (e.target === detailModal) {
            closeModal();
        }
    });

    // Close on Escape keypress
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && detailModal.classList.contains("active")) {
            closeModal();
        }
    });
});
