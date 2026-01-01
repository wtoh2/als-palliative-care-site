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


/*************************************************
 * Resource loading + filtering
 *************************************************/
fetch("assets/data/resources.json")
  .then(response => {
    if (!response.ok) throw new Error("Failed to load resources.json");
    return response.json();
  })
  .then(resources => {
    const container = document.getElementById("resources-list");
    const filterContainer = document.getElementById("category-filters");

    if (!container || !filterContainer) return;

    /* -------------------------------------------
       Read Get Started answers (if any)
    --------------------------------------------*/
    const storedAnswers = sessionStorage.getItem("getStartedAnswers");
    const flowAnswers = storedAnswers ? JSON.parse(storedAnswers) : null;
    const filterMode = flowAnswers ? "topic" : "category";
    const filtersTitleEl = document.getElementById("filters-title");

    if (filtersTitleEl) {
      filtersTitleEl.textContent =
        filterMode === "topic"
          ? "Filter by Topic"
          : "Filter by Category";
    }
    
    const titleEl = document.getElementById("resources-title");
    const subtitleEl = document.getElementById("resources-subtitle");

  function updateResourcesTitle(resultCount = null) {
    if (!titleEl || !subtitleEl) return;

    const parts = [];

    // ---- Role ----
    if (flowAnswers?.role) {
      const roleMap = {
        patients: "Patients",
        carepartners: "Care Partners",
        clinicians: "Clinicians"
      };
      parts.push(roleMap[flowAnswers.role]);
    }

    // ---- Topic / Category ----
    if (flowAnswers?.category) {
      parts.push(
        flowAnswers.category
          .replace(/-/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase())
      );
    } else if (activeCategory && activeCategory !== "all") {
      parts.push(
        activeCategory
          .replace(/-/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase())
      );
    }

    // ---- Language ----
    let languageSuffix = "";
    if (flowAnswers?.language && flowAnswers.language !== "both") {
      const languageMap = {
        en: "English",
        es: "Spanish"
      };
      languageSuffix = ` (${languageMap[flowAnswers.language]})`;
    }

    // ---- Title ----
    if (parts.length === 0) {
      titleEl.textContent = "All Resources";
    } else {
      titleEl.textContent = `${parts.join(" • ")} Resources${languageSuffix}`;
    }

    // ---- Subtitle ----
    const countText =
      typeof resultCount === "number"
        ? `${resultCount} result${resultCount === 1 ? "" : "s"}`
        : "";

    const sortedText =
      parts.length === 0
        ? "Sorted alphabetically by title"
        : "Filtered and sorted alphabetically by title";

    subtitleEl.textContent = countText
      ? `${countText}. ${sortedText}`
      : sortedText;

    subtitleEl.hidden = false;
  }
    
    /* -------------------------------------------
       Sort resources alphabetically (once)
    --------------------------------------------*/
    resources.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    );

    // Deduplicate ONLY for Full Resources view
    const isFullResourcesView = !flowAnswers;

    const processedResources = isFullResourcesView
      ? dedupeResourcesByTitle(resources)
      : resources;

    let activeCategory = "all";

    function dedupeResourcesByTitle(resourceList) {
      const seen = new Map();

      resourceList.forEach(resource => {
        const key = resource.title.trim().toLowerCase();

        if (!seen.has(key)) {
          // clone first occurrence
          seen.set(key, {
            ...resource,
            category: Array.isArray(resource.category)
              ? [...resource.category]
              : []
          });
        } else {
          const existing = seen.get(key);

          // merge categories only
          if (Array.isArray(resource.category)) {
            resource.category.forEach(cat => {
              if (!existing.category.includes(cat)) {
                existing.category.push(cat);
              }
            });
          }
        }
      });

      return Array.from(seen.values());
    }

    function applyFlowFilters(resourceList) {
      if (!flowAnswers) return resourceList;

      return resourceList.filter(resource => {

        /* Step 1 → role → users[] */
        if (
          flowAnswers.role &&
          Array.isArray(resource.users) &&
          !resource.users.includes(flowAnswers.role)
        ) {
          return false;
        }

        /* Step 2 → language → language[] */
        if (
          flowAnswers.language &&
          flowAnswers.language !== "both" &&
          Array.isArray(resource.language) &&
          !resource.language.includes(flowAnswers.language)
        ) {
          return false;
        }

        /* Step 3 → category → category */
        if (
          flowAnswers.category &&
          Array.isArray(resource.category) &&
          !resource.category.includes(flowAnswers.category)
        ) {
          return false;
        }

        return true;
      });
    }
    const baseFilteredResources = applyFlowFilters(processedResources);

    /* -------------------------------------------
       Render cards
    --------------------------------------------*/
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

    /* -------------------------------------------
       Category filtering (respects flow)
    --------------------------------------------*/
    function renderFilteredResources() {
      const baseList = baseFilteredResources; 

      const filtered =
        activeCategory === "all"
          ? baseList
          : baseList.filter(r =>
              filterMode === "topic"
                ? Array.isArray(r.topics) && r.topics.includes(activeCategory)
                : Array.isArray(r.category) && r.category.includes(activeCategory)
            );

      // ---- ZERO RESULTS STATE ----
      if (filtered.length === 0) {
        // Hide filters
        const filters = document.querySelector(".filters");
        if (filters) filters.style.display = "none";

        container.innerHTML = `
          <div class="no-results" role="status" aria-live="polite">
            <h2>No results found</h2>
            <p>
              Press <strong>Back</strong> to try different filters,
              or view all resources.
            </p>

          <button id="view-all-btn" class="hero-btn">
            View All Resources
          </button>
        `;

        const viewAllBtn = document.getElementById("view-all-btn");

        if (viewAllBtn) {
          viewAllBtn.addEventListener("click", () => {
            sessionStorage.removeItem("getStartedAnswers");
            window.location.href = "resources.html";
          });
        }

        updateResourcesTitle(0);
        return;
      }

      // ---- NORMAL STATE ----
      const filters = document.querySelector(".filters");
      if (filters) filters.style.display = "";

      renderResources(filtered);
      updateResourcesTitle(filtered.length);
    }

    /* -------------------------------------------
       Build category buttons
    --------------------------------------------*/
    const categories = [
      "all",
      ...new Set(
        filterMode === "topic"
          ? baseFilteredResources.flatMap(r => r.topics || [])
          : baseFilteredResources.flatMap(r => r.category || [])
      )
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

    /* -------------------------------------------
       Initial render
    --------------------------------------------*/
    renderFilteredResources();
  })
  .catch(error => {
    console.error("Error loading resources:", error);
  });

document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".question-card");
  if (!cards.length) return; // only run on start.html

  const buttons = document.querySelectorAll(".choice-btn");
  function getActiveProgressBar() {
    const activeCard = document.querySelector(".question-card.active");
    if (!activeCard) return null;
    return activeCard.querySelector(".progress-bar");
  }

  let currentStep = 1;
  const totalSteps = cards.length;
  const answers = {
    role: null,
    language: null,
    category: null
  };

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".question-card");
      const step = Number(card.dataset.step);
      const answer = btn.dataset.answer;

      if (step === 1) answers.role = answer;
      if (step === 2) answers.language = answer;
      if (step === 3) answers.category = answer;

      goToStep(step + 1);
    });
  });

  function goToStep(nextStep) {
    const current = document.querySelector(".question-card.active");
    const next = document.querySelector(
      `.question-card[data-step="${nextStep}"]`
    );

    if (!next) {
      sessionStorage.setItem(
        "getStartedAnswers",
        JSON.stringify(answers)
      );

      window.location.href = "resources.html"; // adjust if needed
      return;
    }

    current.classList.remove("active");
    current.classList.add("hidden");
    current.hidden = true;

    next.hidden = false;
    next.classList.remove("hidden");
    next.classList.add("active");
    window.scrollTo({
      top: 0,
      behavior: "instant" // important: no animation
    });

    currentStep = nextStep;
    updateProgress();
  }

  function goBack() {
    const current = document.querySelector(".question-card.active");
    const prevStep = currentStep - 1;
    const prev = document.querySelector(
      `.question-card[data-step="${prevStep}"]`
    );

    if (!prev) return;

    current.classList.remove("active");
    current.hidden = true;

    prev.hidden = false;
    prev.classList.remove("hidden");
    prev.classList.add("active");

    currentStep = prevStep;
    updateProgress();

    window.scrollTo({
      top: 0,
      behavior: "instant" // important: no animation
    });
  }

  function updateProgress() {
    const progressBar = getActiveProgressBar();
    if (!progressBar) return;

    const percent = ((currentStep - 1) / totalSteps) * 100;
    progressBar.style.width = `${percent}%`;
  }

  const backBtn = document.querySelector(".fixed-back");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (currentStep > 1) {
        goBack();
      } else {
        window.history.back();
      }
    });
  }

  updateProgress();
});

// Clear Get Started state when user explicitly wants full list
document.addEventListener("DOMContentLoaded", () => {
  const fullResourcesLink = document.getElementById("full-resources-link");

  if (fullResourcesLink) {
    fullResourcesLink.addEventListener("click", () => {
      sessionStorage.removeItem("getStartedAnswers");
    });
  }
});
