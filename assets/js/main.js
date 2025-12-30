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
  const answers = {};

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".question-card");
      const step = Number(card.dataset.step);
      const answer = btn.dataset.answer;

      answers[`step${step}`] = answer;

      goToStep(step + 1);
    });
  });

  function goToStep(nextStep) {
    const current = document.querySelector(".question-card.active");
    const next = document.querySelector(
      `.question-card[data-step="${nextStep}"]`
    );

    if (!next) {
      console.log("Done!", answers);
      return;
    }

    current.classList.remove("active");
    current.classList.add("hidden");
    current.hidden = true;

    next.hidden = false;
    next.classList.remove("hidden");
    next.classList.add("active");
    next.scrollIntoView({
      behavior: "smooth",
      block: "start"
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

    prev.scrollIntoView({
      behavior: "smooth",
      block: "start"
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
