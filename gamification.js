(function () {
  const content = window.CaptainNovaContent || null;

  const GAME_THEMES = {
    rocketAdventure: {
      id: "rocket-adventure",
      missionLabel: "Mission",
      adventureLabel: "Adventure",
      rewardStages: [
        { key: "base", label: "rocket base" },
        { key: "body", label: "rocket body" },
        { key: "window", label: "rocket window" },
        { key: "wings", label: "rocket wings" },
        { key: "engine", label: "rocket engine" },
        { key: "astronaut", label: "astronaut seat" },
        { key: "flames", label: "launch flames" },
        { key: "launch", label: "launch glow" },
      ],
      messages: content?.gamification?.messages || {
        correct: ["Rocket power rising!", "Mission Control says yes!"],
        gentle: ["Almost there, explorer!", "The next rocket step is waiting!"],
        midpoint: ["Star boost unlocked!", "Halfway through this mission!"],
        sectionComplete: ["Rocket part unlocked!", "Mission complete!"],
        final: ["Countdown complete!", "The rocket is ready to launch!"],
      },
    },
  };

  function prefersReducedMotion() {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatTemplate(template, values) {
    return String(template || "").replace(/\{(\w+)\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
    });
  }

  function secureRandomIndex(length) {
    if (length <= 0) {
      return 0;
    }

    const cryptoApi = globalThis.crypto;
    if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function") {
      throw new Error("Secure randomness is unavailable in this browser.");
    }

    const limit = Math.floor(0x100000000 / length) * length;
    const values = new Uint32Array(1);
    do {
      cryptoApi.getRandomValues(values);
    } while (values[0] >= limit);

    return values[0] % length;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";

  function clearNode(node) {
    node.replaceChildren();
  }

  function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.className) {
      element.className = options.className;
    }

    if (options.textContent !== undefined) {
      element.textContent = options.textContent;
    }

    if (options.attributes) {
      Object.entries(options.attributes).forEach(([name, value]) => {
        if (value !== null && value !== undefined) {
          element.setAttribute(name, String(value));
        }
      });
    }

    return element;
  }

  function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tagName);
    Object.entries(attributes).forEach(([name, value]) => {
      if (value !== null && value !== undefined) {
        element.setAttribute(name, String(value));
      }
    });
    return element;
  }

  function createStaticFragment(markup) {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return template.content;
  }

  function appendFormattedStoryInline(parent, value) {
    const segments = String(value || "").split(/(\*\*.+?\*\*)/g);
    segments.forEach((segment) => {
      if (!segment) {
        return;
      }

      if (segment.startsWith("**") && segment.endsWith("**")) {
        const strong = document.createElement("strong");
        strong.textContent = segment.slice(2, -2);
        parent.append(strong);
        return;
      }

      parent.append(document.createTextNode(segment));
    });
  }

  function buildCelebrationArtworkThumbnailNode(event) {
    if (!event?.artwork?.src) {
      return null;
    }

    const alt = event.artwork.alt || event.title || "Mission artwork";
    const button = createElement("button", {
      className: "celebration-artwork-toggle",
      attributes: {
        type: "button",
        "data-expand-artwork": "",
        "aria-label": "Open mission artwork",
      },
    });
    const image = createElement("img", {
      className: "celebration-artwork-thumb",
      attributes: {
        src: event.artwork.src,
        alt,
        loading: "lazy",
        decoding: "async",
      },
    });
    button.append(image);
    return button;
  }

  function buildCelebrationArtworkExpandedNode(event) {
    if (!event?.artwork?.src) {
      return null;
    }

    const alt = event.artwork.alt || event.title || "Mission artwork";
    const stage = createElement("div", { className: "celebration-artwork-stage" });
    const backButton = createElement("button", {
      className: "celebration-artwork-back",
      attributes: {
        type: "button",
        "data-collapse-artwork": "",
        "aria-label": "Back to mission story",
      },
    });
    const icon = createElement("span", {
      className: "celebration-artwork-back-icon",
      attributes: { "aria-hidden": "true" },
    });
    const iconSvg = createSvgElement("svg", {
      viewBox: "0 0 24 24",
      focusable: "false",
      "aria-hidden": "true",
    });
    iconSvg.append(createSvgElement("path", { d: "M15 5l-7 7 7 7" }));
    icon.append(iconSvg);
    backButton.append(icon);
    backButton.append(createElement("span", { textContent: "Back to story" }));

    const figure = createElement("figure", { className: "celebration-artwork-figure" });
    const canvas = createElement("div", {
      className: "celebration-artwork-canvas",
      attributes: {
        role: "img",
        "aria-label": alt,
      },
    });
    const image = createElement("img", {
      className: "celebration-artwork-image",
      attributes: {
        src: event.artwork.src,
        alt: "",
        "aria-hidden": "true",
        loading: "lazy",
        decoding: "async",
      },
    });
    canvas.append(image);
    figure.append(canvas);
    stage.append(backButton, figure);
    return stage;
  }

  function buildCelebrationBodyNode(text) {
    const sentences = String(text || "")
      .trim()
      .split(/(?<=[.!?])\s+/u)
      .filter(Boolean);

    if (sentences.length === 0) {
      return null;
    }

    const body = createElement("div", { className: "celebration-body" });
    for (let index = 0; index < sentences.length; index += 2) {
      const paragraph = sentences.slice(index, index + 2).join(" ");
      const paragraphElement = document.createElement("p");
      appendFormattedStoryInline(paragraphElement, paragraph);
      body.append(paragraphElement);
    }

    return body;
  }

  function storyMissionForSection(sectionKey) {
    return content?.story?.missions?.find((mission) => mission.section === sectionKey) || null;
  }

  function sectionStateFromSnapshot(snapshot, section, sectionIndex) {
    const questions = snapshot.sessionQuestions
      .filter((question) => question.section === section)
      .map((question, questionIndex) => {
        const isAnswered = snapshot.validatedAnswers[question.id - 1] !== null;
        const isCurrent = snapshot.hasStarted && snapshot.currentIndex === question.id - 1;

        return {
          id: question.id,
          questionIndex,
          isAnswered,
          isCurrent,
        };
      });

    const answeredCount = questions.filter((question) => question.isAnswered).length;
    const currentQuestionIndex = questions.findIndex((question) => question.isCurrent);

    return {
      key: section,
      label: section,
      index: sectionIndex,
      totalQuestions: questions.length,
      answeredCount,
      midpointReached: answeredCount >= Math.ceil(questions.length / 2),
      isCompleted: answeredCount === questions.length && questions.length > 0,
      questions,
      currentQuestionIndex: currentQuestionIndex === -1 ? 0 : currentQuestionIndex,
    };
  }

  function buildGamificationState(snapshot, theme) {
    const totalQuestions = snapshot.sessionQuestions.length;
    const answeredTotal = snapshot.validatedAnswers.filter((answer) => answer !== null).length;
    const sectionStates = snapshot.sections.map((section, index) =>
      sectionStateFromSnapshot(snapshot, section, index),
    );
    const completedSections = sectionStates.filter((section) => section.isCompleted).length;
    const midpointBoosts = sectionStates.filter((section) => section.midpointReached).length;
    const currentQuestion = snapshot.hasStarted ? snapshot.sessionQuestions[snapshot.currentIndex] : null;
    const currentSectionIndex = currentQuestion
      ? snapshot.sections.indexOf(currentQuestion.section)
      : 0;
    const currentSection = sectionStates[currentSectionIndex] || sectionStates[0] || null;
    const currentQuestionNumber = currentSection
      ? currentSection.currentQuestionIndex + 1
      : 1;

    return {
      theme,
      hasStarted: snapshot.hasStarted,
      isSubmitted: snapshot.isSubmitted,
      playerName: snapshot.playerName,
      sections: sectionStates,
      totalSections: snapshot.sections.length,
      totalQuestions,
      answeredTotal,
      completedSections,
      midpointBoosts,
      overallPercent: totalQuestions === 0 ? 0 : Math.round((answeredTotal / totalQuestions) * 100),
      currentSectionIndex,
      currentSection,
      currentQuestionNumber,
      allQuestionsAnswered: totalQuestions > 0 && answeredTotal === totalQuestions,
    };
  }

  function createRocketPart(className, unlocked) {
    return createElement("div", {
      className: `${className} rocket-part${unlocked ? " is-unlocked" : ""}`,
    });
  }

  function buildRocketSceneNode(stageCount, boostCount, isLaunching) {
    const fuelLevel = clamp(boostCount, 0, 8);
    const fuelHeight = Math.round((fuelLevel / 8) * 74);
    const fuelY = 74 - fuelHeight;
    const scene = createElement("div", {
      className: `rocket-scene${isLaunching ? " is-launching" : ""}`,
    });
    const stars = createElement("div", {
      className: "rocket-stars",
      attributes: { "aria-hidden": "true" },
    });
    for (let index = 0; index < fuelLevel; index += 1) {
      stars.append(createElement("span", { className: `rocket-star rocket-star-${index + 1}` }));
    }

    const fuel = createElement("div", { className: "rocket-fuel" });
    const fuelSvg = createSvgElement("svg", {
      class: "rocket-fuel-visual",
      viewBox: "0 0 10 74",
      preserveAspectRatio: "none",
      "aria-hidden": "true",
      focusable: "false",
    });
    const defs = createSvgElement("defs");
    const gradient = createSvgElement("linearGradient", {
      id: "rocket-fuel-gradient",
      x1: "0",
      y1: "74",
      x2: "0",
      y2: "0",
      gradientUnits: "userSpaceOnUse",
    });
    gradient.append(
      createSvgElement("stop", { offset: "0%", "stop-color": "#f4b942" }),
      createSvgElement("stop", { offset: "100%", "stop-color": "#e76f51" }),
    );
    defs.append(gradient);
    fuelSvg.append(
      defs,
      createSvgElement("rect", {
        class: "rocket-fuel-track",
        x: "0",
        y: "0",
        width: "10",
        height: "74",
        rx: "5",
      }),
      createSvgElement("rect", {
        class: "rocket-fuel-fill",
        x: "0",
        y: String(fuelY),
        width: "10",
        height: String(fuelHeight),
        rx: "5",
        "data-fuel-level": String(fuelLevel),
      }),
    );
    fuel.append(fuelSvg);

    scene.append(
      stars,
      fuel,
      createRocketPart("rocket-pad", stageCount >= 1),
      createRocketPart("rocket-body", stageCount >= 2),
      createRocketPart("rocket-window", stageCount >= 3),
      createRocketPart("rocket-wing rocket-wing-left", stageCount >= 4),
      createRocketPart("rocket-wing rocket-wing-right", stageCount >= 4),
      createRocketPart("rocket-engine", stageCount >= 5),
      createRocketPart("rocket-astronaut", stageCount >= 6),
      createRocketPart("rocket-flames", stageCount >= 7),
    );
    return scene;
  }

  function missionRewardIconSvg(key) {
    const icons = {
      base: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <rect x="11" y="24" width="26" height="8" rx="3"></rect>
          <path d="M16 32v5M32 32v5M8 39h32"></path>
        </svg>
      `,
      body: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 8c6 4 10 11 10 19v8H14v-8c0-8 4-15 10-19Z"></path>
          <path d="M18 35h12"></path>
        </svg>
      `,
      window: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 9c6 4 10 11 10 18v8H14v-8c0-7 4-14 10-18Z"></path>
          <circle cx="24" cy="23" r="5"></circle>
        </svg>
      `,
      wings: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 8c5 4 8 10 8 17v10H16V25c0-7 3-13 8-17Z"></path>
          <path d="M16 28l-7 5 7 2M32 28l7 5-7 2"></path>
        </svg>
      `,
      engine: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 8c5 4 8 10 8 17v6H16v-6c0-7 3-13 8-17Z"></path>
          <path d="M18 31h12"></path>
          <path d="M20 31l-2 7h12l-2-7"></path>
        </svg>
      `,
      astronaut: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="15" r="5"></circle>
          <path d="M17 30v-7c0-3 3-5 7-5s7 2 7 5v7"></path>
          <path d="M18 31h12v7H18z"></path>
        </svg>
      `,
      flames: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 9c5 4 8 10 8 17v4H16v-4c0-7 3-13 8-17Z"></path>
          <path d="M24 39c-4 0-7-3-7-7 0-3 2-5 4-7 1 2 2 3 3 4 1-2 3-4 5-6 2 2 3 5 3 8 0 4-4 8-8 8Z"></path>
        </svg>
      `,
      launch: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="7"></circle>
          <path d="M24 6v7M24 35v7M6 24h7M35 24h7M12 12l5 5M31 31l5 5M12 36l5-5M31 17l5-5"></path>
        </svg>
      `,
    };

    return icons[key] || icons.base;
  }

  function buildMissionRewardIconNode(key) {
    const fragment = createStaticFragment(missionRewardIconSvg(key));
    return fragment.firstElementChild;
  }

  function renderCelebrationVisualNode(event) {
    if (!event) {
      return null;
    }

    if (event.variant === "section" && event.artwork?.src) {
      return buildCelebrationArtworkThumbnailNode(event);
    }

    if (event.variant === "section" && event.rewardKey) {
      const visual = createElement("div", {
        className: `celebration-reward-visual reward-${event.rewardKey}`,
        attributes: { "aria-hidden": "true" },
      });
      const icon = buildMissionRewardIconNode(event.rewardKey);
      if (icon) {
        visual.append(icon);
      }
      return visual;
    }

    if (event.variant === "final") {
      const wrap = createElement("div", { className: "celebration-rocket-wrap" });
      wrap.append(buildRocketSceneNode(event.stageCount, event.boostCount, true));
      return wrap;
    }

    return null;
  }

  class EncouragementMessageManager {
    constructor(theme) {
      this.theme = theme;
      this.lastIndexByPool = {};
    }

    pick(poolName) {
      const pool = this.theme.messages[poolName] || [];

      if (pool.length === 0) {
        return "";
      }

      if (pool.length === 1) {
        return pool[0];
      }

      let index = secureRandomIndex(pool.length);
      if (index === this.lastIndexByPool[poolName]) {
        index = (index + 1) % pool.length;
      }

      this.lastIndexByPool[poolName] = index;
      return pool[index];
    }
  }

  class ProgressIndicator {
    constructor(root, theme) {
      this.root = root;
      this.theme = theme;
    }

    render(state) {
      if (!state.hasStarted || !state.currentSection) {
        clearNode(this.root);
        return;
      }

      const section = state.currentSection;
      const article = createElement("article", {
        className: "gamification-panel mission-panel",
      });
      article.append(
        createElement("p", {
          className: "gamification-kicker",
          textContent: `${this.theme.missionLabel} ${section.index + 1} of ${state.totalSections}`,
        }),
        createElement("strong", {
          textContent: `Mission step ${state.currentQuestionNumber} of ${section.totalQuestions}`,
        }),
        createElement("span", {
          textContent: `${section.answeredCount} of ${section.totalQuestions} rocket steps powered`,
        }),
      );

      const dots = createElement("div", {
        className: "mission-dots",
        attributes: {
          role: "img",
          "aria-label": `${section.answeredCount} of ${section.totalQuestions} questions finished in this mission`,
        },
      });
      section.questions.forEach((question) => {
        const dot = createElement("span", {
          className: [
            "mission-dot",
            question.isAnswered ? "is-complete" : "",
            question.isCurrent ? "is-current" : "",
          ]
            .filter(Boolean)
            .join(" "),
          attributes: { "aria-hidden": "true" },
        });
        dot.append(createElement("span", { className: "mission-dot-core" }));
        dots.append(dot);
      });

      article.append(dots);
      clearNode(this.root);
      this.root.append(article);
    }
  }

  class OverallProgressBar {
    constructor(root, theme) {
      this.root = root;
      this.theme = theme;
    }

    render(state) {
      if (!state.hasStarted) {
        clearNode(this.root);
        return;
      }

      const article = createElement("article", {
        className: "gamification-panel overall-panel",
      });
      article.append(
        createElement("p", {
          className: "gamification-kicker",
          textContent: `${state.answeredTotal} of ${state.totalQuestions} mission steps`,
        }),
        createElement("strong", {
          textContent: `${state.completedSections} of ${state.totalSections} missions completed`,
        }),
      );
      const rail = createElement("div", {
        className: "overall-progress-rail",
        attributes: { "aria-hidden": "true" },
      });
      const svg = createSvgElement("svg", {
        class: "overall-progress-visual",
        viewBox: "0 0 100 12",
        preserveAspectRatio: "none",
        "aria-hidden": "true",
        focusable: "false",
      });
      const defs = createSvgElement("defs");
      const gradient = createSvgElement("linearGradient", {
        id: "overall-progress-gradient",
        x1: "0",
        y1: "0",
        x2: "100",
        y2: "0",
        gradientUnits: "userSpaceOnUse",
      });
      gradient.append(
        createSvgElement("stop", { offset: "0%", "stop-color": "#f4b942" }),
        createSvgElement("stop", { offset: "50%", "stop-color": "#e76f51" }),
        createSvgElement("stop", { offset: "100%", "stop-color": "#2a9d8f" }),
      );
      defs.append(gradient);
      svg.append(
        defs,
        createSvgElement("rect", {
          class: "overall-progress-track",
          x: "0",
          y: "0",
          width: "100",
          height: "12",
          rx: "6",
        }),
        createSvgElement("rect", {
          class: "overall-progress-fill",
          x: "0",
          y: "0",
          width: String(state.overallPercent),
          height: "12",
          rx: "6",
          "data-progress": String(state.overallPercent),
        }),
      );
      rail.append(svg);
      article.append(
        rail,
        createElement("span", {
          textContent: `${state.totalQuestions - state.answeredTotal} mission steps left before launch`,
        }),
      );
      clearNode(this.root);
      this.root.append(article);
    }
  }

  class RocketProgressVisual {
    constructor(root, theme) {
      this.root = root;
      this.theme = theme;
    }

    render(state) {
      if (!state.hasStarted) {
        clearNode(this.root);
        return;
      }

      const stageCount = clamp(state.completedSections, 0, this.theme.rewardStages.length);
      const nextStage = this.theme.rewardStages[state.completedSections];
      const statusLine =
        stageCount === this.theme.rewardStages.length
          ? "All rocket parts are ready for lift-off."
          : `Next unlock: ${nextStage.label}.`;
      const rewardLine =
        state.midpointBoosts === 0
          ? "Star boosts appear at each mission halfway point."
          : `${state.midpointBoosts} star boosts are lighting the rocket so far.`;

      const article = createElement("article", {
        className: `gamification-panel rocket-panel${stageCount === this.theme.rewardStages.length ? " is-finished" : ""}`,
      });
      const copy = createElement("div", { className: "rocket-copy" });
      copy.append(
        createElement("p", {
          className: "gamification-kicker",
          textContent: "Rocket build",
        }),
        createElement("strong", {
          textContent: `${stageCount} of ${this.theme.rewardStages.length} rocket stages unlocked`,
        }),
        createElement("span", { textContent: statusLine }),
        createElement("span", { textContent: rewardLine }),
      );
      article.append(
        copy,
        buildRocketSceneNode(stageCount, state.midpointBoosts, stageCount === this.theme.rewardStages.length),
      );
      clearNode(this.root);
      this.root.append(article);
    }
  }

  class QuestionFeedback {
    constructor(root, panelRoot, messageManager) {
      this.root = root;
      this.panelRoot = panelRoot;
      this.messageManager = messageManager;
    }

    clear() {
      clearNode(this.root);
      this.panelRoot.classList.remove("is-feedback-correct", "is-feedback-gentle");
    }

    show(event) {
      this.clear();

      const isCorrect = event.isCorrect;
      const tone = isCorrect ? "correct" : "gentle";
      const message = this.messageManager.pick(isCorrect ? "correct" : "gentle");
      const effectLabel = isCorrect ? "sparkle" : "boost";

      const toast = createElement("div", {
        className: `question-feedback-toast is-${tone}`,
        attributes: { role: "status" },
      });
      toast.append(
        createElement("span", {
          className: "question-feedback-effect",
          textContent: effectLabel,
          attributes: { "aria-hidden": "true" },
        }),
        createElement("strong", { textContent: message }),
      );
      this.root.append(toast);

      this.panelRoot.classList.add(isCorrect ? "is-feedback-correct" : "is-feedback-gentle");
    }
  }

  class CelebrationOverlay {
    constructor(root, options = {}) {
      this.root = root;
      this.queue = [];
      this.current = null;
      this.timeoutId = null;
      this.isArtworkExpanded = false;
      this.onStateChange = options.onStateChange || null;
      this.boundClick = this.handleClick.bind(this);
      this.root.addEventListener("click", this.boundClick);
    }

    hasBlockingEvent() {
      return Boolean(
        (this.current && this.current.blocksMission) ||
          this.queue.some((event) => event.blocksMission),
      );
    }

    notifyStateChange(extraState = {}) {
      if (typeof this.onStateChange === "function") {
        this.onStateChange({
          currentEvent: this.current,
          hasBlocking: this.hasBlockingEvent(),
          ...extraState,
        });
      }
    }

    handleClick(event) {
      const dismissButton = event.target.closest("[data-dismiss-celebration]");
      if (!dismissButton) {
        const expandArtworkButton = event.target.closest("[data-expand-artwork]");
        if (expandArtworkButton) {
          event.preventDefault();
          event.stopPropagation();
          this.isArtworkExpanded = true;
          this.renderCurrent();
          return;
        }

        const collapseArtworkButton = event.target.closest("[data-collapse-artwork]");
        if (collapseArtworkButton) {
          event.preventDefault();
          event.stopPropagation();
          this.isArtworkExpanded = false;
          this.renderCurrent();
        }
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.dismiss();
    }

    renderCurrent() {
      if (!this.current) {
        clearNode(this.root);
        return;
      }

      if (this.isArtworkExpanded && this.current.artwork?.src) {
        const overlay = createElement("div", {
          className: `celebration-overlay is-${this.current.variant}`,
          attributes: {
            role: "dialog",
            "aria-modal": "true",
          },
        });
        const card = createElement("div", {
          className: "celebration-card is-artwork-expanded",
        });
        const artwork = buildCelebrationArtworkExpandedNode(this.current);
        if (artwork) {
          card.append(artwork);
        }
        overlay.append(card);
        clearNode(this.root);
        this.root.append(overlay);
        return;
      }

      const overlay = createElement("div", {
        className: `celebration-overlay is-${this.current.variant}`,
        attributes: {
          role: "dialog",
          "aria-modal": "true",
        },
      });
      if (this.current.variant === "final") {
        for (let index = 0; index < 10; index += 1) {
          overlay.append(createElement("span", {
            className: `celebration-confetti celebration-confetti-${index + 1}`,
          }));
        }
      }

      const card = createElement("div", { className: "celebration-card" });
      const contentNode = createElement("div", { className: "celebration-content" });
      contentNode.append(
        createElement("p", {
          className: "celebration-kicker",
          textContent: this.current.kicker,
        }),
        createElement("h3", { textContent: this.current.title }),
      );
      const body = buildCelebrationBodyNode(this.current.body);
      if (body) {
        contentNode.append(body);
      }
      if (this.current.reward) {
        contentNode.append(createElement("div", {
          className: "celebration-reward",
          textContent: this.current.reward,
        }));
      }
      const visual = renderCelebrationVisualNode(this.current);
      if (visual) {
        contentNode.append(visual);
      }
      card.append(contentNode);

      if (this.current.showButton) {
        const actions = createElement("div", { className: "celebration-actions" });
        actions.append(createElement("button", {
          className: "celebration-button",
          textContent: this.current.buttonLabel || "Back to Mission",
          attributes: {
            type: "button",
            "data-dismiss-celebration": "",
          },
        }));
        card.append(actions);
      }

      overlay.append(card);
      clearNode(this.root);
      this.root.append(overlay);
    }

    enqueue(event) {
      this.queue.push(event);
      if (this.current) {
        this.notifyStateChange();
        return;
      }

      this.showNext();
    }

    showNext() {
      if (this.current || this.queue.length === 0) {
        return;
      }

      this.current = this.queue.shift();
      this.isArtworkExpanded = false;
      this.renderCurrent();
      this.notifyStateChange();
    }

    dismiss() {
      if (this.timeoutId) {
        window.clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      const dismissedEvent = this.current;
      this.current = null;
      this.isArtworkExpanded = false;
      clearNode(this.root);
      this.notifyStateChange({ dismissedEvent });

      if (this.queue.length > 0) {
        window.setTimeout(() => this.showNext(), 80);
      }
    }

    clearAll() {
      if (this.timeoutId) {
        window.clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      this.queue = [];
      this.current = null;
      this.isArtworkExpanded = false;
      clearNode(this.root);
      this.notifyStateChange();
    }

    reset() {
      this.clearAll();
    }
  }

  class GamificationController {
    constructor(options) {
      this.theme = options.theme || GAME_THEMES.rocketAdventure;
      this.roots = options.roots;
      this.messageManager = new EncouragementMessageManager(this.theme);
      this.progressIndicator = new ProgressIndicator(options.roots.sectionProgressRoot, this.theme);
      this.overallProgressBar = new OverallProgressBar(options.roots.overallProgressRoot, this.theme);
      this.rocketProgressVisual = new RocketProgressVisual(options.roots.rocketProgressRoot, this.theme);
      this.questionFeedback = new QuestionFeedback(
        options.roots.questionFeedbackRoot,
        options.roots.questionPanel,
        this.messageManager,
      );
      this.celebrationOverlay = new CelebrationOverlay(options.roots.overlayRoot, {
        onStateChange: options.callbacks?.onOverlayStateChange,
      });
      this.introductionSeen = new Set();
      this.pendingIntroductionSectionKey = null;
      this.pendingSectionCompletionKey = null;
      this.midpointSeen = new Set();
      this.sectionCompletionSeen = new Set();
      this.finalSeen = false;
      this.state = null;
      this.lastSyncedSectionKey = null;
    }

    sync(snapshot, options = {}) {
      this.state = buildGamificationState(snapshot, this.theme);
      const currentSectionKey = this.state.currentSection?.key || null;
      const shouldReplayIntroduction =
        currentSectionKey !== null && this.pendingIntroductionSectionKey === currentSectionKey;
      const sectionChanged = currentSectionKey !== this.lastSyncedSectionKey;
      const skipSectionCompletion = Boolean(options.skipSectionCompletion);
      const shouldShowHud = this.state.hasStarted;
      this.roots.hudRoot.classList.toggle("is-hidden", !shouldShowHud);
      this.progressIndicator.render(this.state);
      this.overallProgressBar.render(this.state);
      this.rocketProgressVisual.render(this.state);
      this.maybeTriggerMissionIntroduction(this.state, {
        allowReplay: shouldReplayIntroduction || sectionChanged,
      });
      if (shouldReplayIntroduction) {
        this.pendingIntroductionSectionKey = null;
      }
      const shouldReplayCompletion =
        currentSectionKey !== null && this.pendingSectionCompletionKey === currentSectionKey;
      if (!skipSectionCompletion) {
        this.maybeTriggerSectionCompletion(this.state, {
          allowReplay: shouldReplayCompletion,
        });
      }
      if (shouldReplayCompletion && !skipSectionCompletion) {
        this.pendingSectionCompletionKey = null;
      }
      this.lastSyncedSectionKey = currentSectionKey;
      return this.state;
    }

    onAnswerEvaluated(snapshot, answerEvent) {
      const state = this.sync(snapshot, {
        skipSectionCompletion: true,
      });
      if (!state.hasStarted || !state.currentSection) {
        return state;
      }

      this.questionFeedback.show(answerEvent);
      this.maybeTriggerMidpoint(state);
      this.maybeTriggerSectionCompletion(state, {
        advanceOnDismiss: answerEvent?.isCorrect !== false,
      });
      return state;
    }

    onTestCompleted(snapshot) {
      const state = this.sync(snapshot);
      this.maybeTriggerFinalCelebration(state);
      return state;
    }

    clearTransientFeedback() {
      this.questionFeedback.clear();
      this.celebrationOverlay.clearAll();
    }

    hasBlockingOverlay() {
      return this.celebrationOverlay.hasBlockingEvent();
    }

    requestMissionIntroduction(sectionKey) {
      this.pendingIntroductionSectionKey = sectionKey || null;
    }

    sectionStateForKey(sectionKey) {
      if (!this.state || !sectionKey) {
        return null;
      }

      return this.state.sections.find((section) => section.key === sectionKey) || null;
    }

    enqueueMissionIntroduction(state, section) {
      const mission = storyMissionForSection(section.key);
      const reward = this.theme.rewardStages[section.index];
      const rewardLabel = mission?.rocketPart || reward?.label || section.label;

      this.celebrationOverlay.enqueue({
        variant: "intro",
        sectionKey: section.key,
        kicker: content?.gamification?.introductionTitle || "Mission Introduction",
        title: `${this.theme.missionLabel} ${section.index + 1}: ${mission?.title || section.label}`,
        body:
          mission?.introduction ||
          content?.gamification?.introductionBody ||
          "Captain Nova has a new mission briefing for you.",
        reward: formatTemplate(content?.gamification?.introductionReward || "Unlock: {reward}", {
          reward: rewardLabel,
        }),
        stageCount: state.completedSections,
        boostCount: state.midpointBoosts,
        showButton: true,
        buttonLabel: content?.gamification?.introductionButton || "Start mission",
        blocksMission: true,
      });
    }

    enqueueMissionUpdate(state, section) {
      const mission = storyMissionForSection(section.key);
      this.celebrationOverlay.enqueue({
        variant: "midpoint",
        sectionKey: section.key,
        kicker: `${this.theme.missionLabel} ${section.index + 1}`,
        title: content?.gamification?.midpointTitle || "Mission Update",
        body:
          mission?.midMissionUpdate ||
          content?.gamification?.midpointBody ||
          "You are halfway through this mission and your rocket just got a boost.",
        stageCount: state.completedSections,
        boostCount: state.midpointBoosts,
        showButton: true,
        buttonLabel: content?.gamification?.midpointButton || "Continue mission",
        blocksMission: true,
      });
    }

    enqueueMissionCompletion(state, section, options = {}) {
      const reward = this.theme.rewardStages[section.index];
      const mission = storyMissionForSection(section.key);
      const rewardLabel = mission?.rocketPart || reward.label;
      const advanceOnDismiss = options.advanceOnDismiss !== false;

      this.celebrationOverlay.enqueue({
        variant: "section",
        sectionKey: section.key,
        kicker: `${this.theme.missionLabel} ${section.index + 1} complete`,
        title: formatTemplate(
          content?.gamification?.sectionCompleteTitle || "{reward} unlocked!",
          { reward: rewardLabel },
        ),
        body:
          mission?.rewardDebrief ||
          formatTemplate(
            content?.gamification?.sectionCompleteBody ||
              "Mission complete. Captain Nova just locked {reward} into place.",
            { reward: rewardLabel },
          ),
        artwork: mission?.completionArtwork || null,
        stageCount: state.completedSections,
        boostCount: state.midpointBoosts,
        rewardKey: reward.key,
        showButton: true,
        buttonLabel: advanceOnDismiss
          ? (content?.gamification?.sectionCompleteButton || "Next mission")
          : "Back to mission",
        advanceOnDismiss,
        blocksMission: true,
      });
    }

    showMissionUpdate(sectionKey) {
      const section = this.sectionStateForKey(sectionKey);
      if (!this.state || !section) {
        return;
      }

      this.midpointSeen.add(section.key);
      this.enqueueMissionUpdate(this.state, section);
    }

    showMissionCompletion(sectionKey) {
      const section = this.sectionStateForKey(sectionKey);
      if (!this.state || !section) {
        return;
      }

      this.sectionCompletionSeen.add(section.key);
      this.enqueueMissionCompletion(this.state, section);
    }

    requestMissionCompletion(sectionKey) {
      this.pendingSectionCompletionKey = sectionKey || null;
    }

    maybeTriggerMissionIntroduction(state, options = {}) {
      const section = state.currentSection;
      const allowReplay = Boolean(options.allowReplay);
      if (
        !state.hasStarted ||
        !section ||
        section.answeredCount > 0 ||
        (!allowReplay && this.introductionSeen.has(section.key))
      ) {
        return;
      }

      this.introductionSeen.add(section.key);
      this.enqueueMissionIntroduction(state, section);
    }

    maybeTriggerMidpoint(state) {
      const section = state.currentSection;
      const midpointTarget = Math.ceil(section.totalQuestions / 2);
      if (section.answeredCount !== midpointTarget || this.midpointSeen.has(section.key)) {
        return;
      }

      this.midpointSeen.add(section.key);
      this.enqueueMissionUpdate(state, section);
    }

    maybeTriggerSectionCompletion(state, options = {}) {
      const section = state.currentSection;
      const allowReplay = Boolean(options.allowReplay);
      if (!section.isCompleted || (!allowReplay && this.sectionCompletionSeen.has(section.key))) {
        return;
      }

      this.sectionCompletionSeen.add(section.key);
      this.enqueueMissionCompletion(state, section, {
        advanceOnDismiss: options.advanceOnDismiss,
      });
    }

    maybeTriggerFinalCelebration(state) {
      if (!state.allQuestionsAnswered || this.finalSeen) {
        return;
      }

      this.finalSeen = true;
      this.celebrationOverlay.enqueue({
        variant: "final",
        kicker: `${this.theme.adventureLabel} complete`,
        title: content?.gamification?.finalTitle || "All missions complete!",
        body:
          content?.gamification?.finalBody ||
          "Amazing job finishing all 8 missions. Your rocket is ready for launch.",
        reward: content?.gamification?.finalReward || "Full rocket launch unlocked",
        stageCount: this.theme.rewardStages.length,
        boostCount: state.midpointBoosts,
        showButton: true,
        buttonLabel: content?.gamification?.finalButton || "Back to Mission",
        blocksMission: false,
      });
    }

    reset() {
      this.state = null;
      this.introductionSeen.clear();
      this.pendingIntroductionSectionKey = null;
      this.pendingSectionCompletionKey = null;
      this.midpointSeen.clear();
      this.sectionCompletionSeen.clear();
      this.finalSeen = false;
      this.lastSyncedSectionKey = null;
      this.questionFeedback.clear();
      this.celebrationOverlay.reset();
      this.roots.hudRoot.classList.add("is-hidden");
      this.progressIndicator.render({ hasStarted: false });
      this.overallProgressBar.render({ hasStarted: false });
      this.rocketProgressVisual.render({ hasStarted: false });
    }
  }

  function createGamificationController(options) {
    const theme = GAME_THEMES[options.themeId] || GAME_THEMES.rocketAdventure;
    return new GamificationController({
      theme,
      roots: options.roots,
      callbacks: options.callbacks,
    });
  }

  window.GiftedGamification = Object.freeze({
    themes: GAME_THEMES,
    createGamificationController,
    ...(window.__GiftedExposeTestUtils
      ? {
          __testPrefersReducedMotion: prefersReducedMotion,
        }
      : {}),
  });
})();
