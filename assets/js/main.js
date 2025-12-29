document.addEventListener("DOMContentLoaded", () => {
  const scrollUpBtn = document.getElementById("scroll-up");
  const scrollDownBtn = document.getElementById("scroll-down");

  const scrollAmount = () => window.innerHeight * 0.2;

  if (scrollUpBtn) {
    scrollUpBtn.addEventListener("click", () => {
      window.scrollBy({
        top: -scrollAmount(),
        behavior: "smooth"
      });
    });
  }

  if (scrollDownBtn) {
    scrollDownBtn.addEventListener("click", () => {
      window.scrollBy({
        top: scrollAmount(),
        behavior: "smooth"
      });
    });
  }
});

fetch("assets/data/resources.json")
  .then(response => {
    if (!response.ok) {
      throw new Error("Failed to load resources.json");
    }
    return response.json();
  })
  .then(resources => {
    const container = document.getElementById("resources-list");
    const filterContainer = document.getElementById("category-filters");

    if (!container || !filterContainer) return;

    // --------------------------------------------------
    // Sort resources alphabetically by title (once)
    // --------------------------------------------------
    resources.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    );

    let activeCategory = "all";

    // --------------------------------------------------
    // Render resource cards
    // --------------------------------------------------
    function renderResources(resourceList) {
      container.innerHTML = "";

      resourceList.forEach(resource => {
        const card = document.createElement("a");

        card.href = resource.url;
        card.className = "resource-card";
        card.setAttribute("tabindex", "0");

        card.target = "_blank";
        card.rel = "noopener noreferrer";

        card.setAttribute(
        "aria-label",
        `${resource.title} (opens in a new tab)`
        );

        card.innerHTML = `
          <div class="resource-meta">
            <span class="resource-source">${resource.source}</span>
            <span class="resource-type">${resource.type}</span>
          </div>

          <h2 class="resource-title">${resource.title}</h2>

          <p class="resource-description">
            ${resource.description}
          </p>
        `;

        container.appendChild(card);
      });
    }

    // --------------------------------------------------
    // Filter + re-render
    // --------------------------------------------------
    function renderFilteredResources() {
      const filtered =
        activeCategory === "all"
          ? resources
          : resources.filter(r => r.category === activeCategory);

      renderResources(filtered);
    }

    // --------------------------------------------------
    // Build category filter buttons
    // --------------------------------------------------
    const categories = [
      "all",
      ...new Set(resources.map(r => r.category))
    ];

    categories.forEach(category => {
      const button = document.createElement("button");
      button.className = "filter-btn";

      button.textContent =
        category === "all"
          ? "All"
          : category.replace(/-/g, " ");

      if (category === "all") {
        button.classList.add("active");
      }

      button.addEventListener("click", () => {
        activeCategory = category;

        document
          .querySelectorAll(".filter-btn")
          .forEach(btn => btn.classList.remove("active"));

        button.classList.add("active");
        renderFilteredResources();
      });

      filterContainer.appendChild(button);
    });

    // --------------------------------------------------
    // Initial render (All categories)
    // --------------------------------------------------
    renderResources(resources);
  })
  .catch(error => {
    console.error("Error loading resources:", error);
  });

