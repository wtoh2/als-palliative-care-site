const TOPIC_DISPLAY_MAP = {
  "How Palliative Care and Hospice are Different": "Palliative vs. Hospice",
  "Breathing Assistance Decisions": "Breathing",
  "Feeding Assistance Decisions": "Feeding",
  "Benefits, Timing, and Who Provides It": "Benefits/Timing/Providers"
  // add as many as you want
};

function getTopicLabel(topic) {
  return TOPIC_DISPLAY_MAP[topic] 
    || topic.replace(/-/g, " ");
}

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
      if (filterMode === "topic" && flowAnswers?.category) {
        const categoryLabel = flowAnswers.category
          .replace(/-/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());

        filtersTitleEl.textContent = `Filter by ${categoryLabel} Subtopics`;
      } else {
        filtersTitleEl.textContent = "Filter by Category";
      }
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

    const processedResources = dedupeResourcesByTitle(resources);

    let activeCategory = "all";

    function dedupeResourcesByTitle(resourceList) {
      const map = new Map();

      resourceList.forEach(resource => {
        const key = resource.title.trim().toLowerCase();

        if (!map.has(key)) {
          map.set(key, {
            title: resource.title,
            url: resource.url,
            source: resource.source,
            type: resource.type,
            description: resource.description,   // ✅ FIX
            users: resource.users || [],          // ✅ preserve for flow filters
            language: resource.language || [],    // ✅ preserve for flow filters
            categories: [],
            topicsByCategory: {}
          });
        }

        const merged = map.get(key);

        // ---- Categories + topics ----
        if (Array.isArray(resource.category)) {
          resource.category.forEach(cat => {
            if (!merged.categories.includes(cat)) {
              merged.categories.push(cat);
            }

            if (!merged.topicsByCategory[cat]) {
              merged.topicsByCategory[cat] = [];
            }

            if (Array.isArray(resource.topics)) {
              resource.topics.forEach(topic => {
                if (!merged.topicsByCategory[cat].includes(topic)) {
                  merged.topicsByCategory[cat].push(topic);
                }
              });
            }
          });
        }
      });

      return Array.from(map.values());
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
          !resource.categories.includes(flowAnswers.category)
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

      const topicsHtml = `
        <div class="resource-topics-inline">
          ${Object.entries(resource.topicsByCategory)
            .map(([category, topics]) => `
              <span class="resource-category-label">
                ${category.replace(/-/g, " ")}:
              </span>
              ${topics.map(topic => `
                <span class="resource-topic">
                  ${getTopicLabel(topic)}
                </span>
              `).join("")}
            `)
            .join("")}
        </div>

        <div class="resource-divider"></div>
      `;

      card.innerHTML = `
        <div class="resource-meta">
          <span class="resource-source">${resource.source}</span>
          <span class="resource-type">${resource.type}</span>
        </div>

        ${topicsHtml}

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

      const filtered = baseList.filter(resource => {
        // ---- Category filter ----
        if (filterMode === "category" && activeCategory !== "all") {
          return resource.categories.includes(activeCategory);
        }

        // ---- Topic filter ----
        if (filterMode === "topic" && activeCategory !== "all") {
          if (flowAnswers?.category) {
            // Get Started: ONLY topics under selected category
            const scopedTopics =
              resource.topicsByCategory[flowAnswers.category] || [];
            return scopedTopics.includes(activeCategory);
          }

          // Normal view: ANY category match
          return Object.values(resource.topicsByCategory)
            .flat()
            .includes(activeCategory);
        }

        return true;
      });

      // ---- ZERO RESULTS STATE ----
      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="no-results" role="status" aria-live="polite">
            <h2>No results found</h2>
            <p>
              Press <strong>Back</strong> to try different filters,
              or view all resources.
            </p>

            <button id="view-all-btn" class="hero-btn no-results-btn">
              View All Resources
            </button>
          </div>
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
    const categories = ["all", ...new Set(
      filterMode === "topic"
        ? processedResources.flatMap(r => {
            if (flowAnswers?.category) {
              return r.topicsByCategory[flowAnswers.category] || [];
            }
            return Object.values(r.topicsByCategory).flat();
          })
        : processedResources.flatMap(r => r.categories)
    )];

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
