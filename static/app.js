(function () {
  const API = "/api";
  const tabsEl = document.querySelector(".tabs");
  const paneContainer = document.getElementById("pane-container");
  const welcomeEl = document.getElementById("welcome");
  const sidebarEl = document.getElementById("sidebar");
  const noteListEl = document.getElementById("note-list");
  const openVaultBtn = document.querySelector(".open-vault");
  const closeSidebarBtn = document.querySelector(".close-sidebar");
  const fuzzyOverlay = document.getElementById("fuzzy-overlay");
  const fuzzyInput = document.getElementById("fuzzy-input");
  const fuzzyResults = document.getElementById("fuzzy-results");

  let tabs = [];
  let activeTabId = null;
  let allNotes = [];
  let staticData =
    null; /* { notes, latest, notes_by_slug } when running as static site */
  let fuzzySelectedIndex = 0;
  let fuzzyFiltered = [];

  function tabId(slug) {
    return "tab-" + slug;
  }

  function parseNotePath() {
    const m = /^\/note\/(.+)$/.exec(location.pathname);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setNotePath(slug) {
    const path = "/note/" + encodeURIComponent(slug);
    if (location.pathname !== path) history.pushState({ slug }, "", path);
  }

  function clearNotePath() {
    if (location.pathname !== "/") history.replaceState({}, "", "/");
  }

  function openNote(slug, title, options = {}) {
    const id = tabId(slug);
    const existing = tabs.find((t) => t.slug === slug);
    if (existing) {
      setActiveTab(existing.id);
      if (options.focus !== false) {
        document.getElementById(existing.id)?.focus();
      }
      setNotePath(slug);
      return;
    }

    const tab = {
      id,
      slug,
      title: title || slug,
      html: null,
      extra_info: null,
      loaded: false,
    };
    tabs.push(tab);
    renderTabBar();
    setActiveTab(id);
    setNotePath(slug);
    loadNoteContent(tab);
  }

  function loadNoteContent(tab) {
    if (tab.loaded && tab.html !== null) {
      showPane(tab);
      return;
    }
    if (
      staticData &&
      staticData.notes_by_slug &&
      staticData.notes_by_slug[tab.slug]
    ) {
      const data = staticData.notes_by_slug[tab.slug];
      tab.title = data.title;
      tab.html = data.html;
      tab.extra_info = data.extra_info ?? null;
      tab.loaded = true;
      showPane(tab);
      updateTabTitle(tab);
      attachWikiLinks(tab.id);
      return;
    }
    fetch(`${API}/note/${encodeURIComponent(tab.slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data) {
          tab.title = tab.slug;
          tab.html = "<p>Note not found.</p>";
          tab.extra_info = null;
        } else {
          tab.title = data.title;
          tab.html = data.html;
          tab.extra_info = data.extra_info ?? null;
        }
        tab.loaded = true;
        showPane(tab);
        updateTabTitle(tab);
        attachWikiLinks(tab.id);
      })
      .catch(() => {
        tab.html = "<p>Failed to load note.</p>";
        tab.loaded = true;
        showPane(tab);
      });
  }

  const PANE_WIDTH = 360;
  const COLLAPSED_WIDTH = 48;
  const MOBILE_BREAKPOINT = 768;

  function updateTabTitle(tab) {
    const tabEl = document.querySelector(
      `[data-tab-id="${tab.id}"] .tab-title`,
    );
    if (tabEl) tabEl.textContent = tab.title;
  }

  function ensurePaneWrapper(tab) {
    let wrap = document.getElementById("pane-wrap-" + tab.id);
    if (wrap) return wrap;
    wrap = document.createElement("div");
    wrap.id = "pane-wrap-" + tab.id;
    wrap.className = "pane-wrapper";
    wrap.setAttribute("data-tab-id", tab.id);
    wrap.setAttribute("role", "tabpanel");
    wrap.setAttribute("aria-labelledby", tab.id);
    wrap.innerHTML =
      '<div class="pane-header">' +
      '<span class="pane-title">' +
      escapeHtml(tab.title) +
      "</span>" +
      '<button type="button" class="pane-close" aria-label="Close">×</button>' +
      "</div>" +
      '<div class="pane-body"><div class="pane" id="pane-' +
      tab.id +
      '"></div></div>';
    wrap
      .querySelector(".pane-title")
      .addEventListener("click", () => setActiveTab(tab.id));
    wrap
      .querySelector(".pane-close")
      .addEventListener("click", (e) => closeTab(tab.id, e));
    wrap.addEventListener("click", (e) => {
      if (
        wrap.classList.contains("collapsed") &&
        !e.target.closest(".pane-close")
      )
        setActiveTab(tab.id);
    });
    paneContainer.appendChild(wrap);
    return wrap;
  }

  function showPane(tab) {
    welcomeEl.classList.add("hidden");
    paneContainer.classList.add("visible");
    const wrap = ensurePaneWrapper(tab);
    const pane = document.getElementById("pane-" + tab.id);
    if (pane) {
      const preface = tab.extra_info
        ? '<div class="pane-preface">' + escapeHtml(tab.extra_info) + "</div>"
        : "";
      pane.innerHTML = preface + (tab.html || "");
      attachWikiLinks(tab.id);
      if (window.wikiTypeset) window.wikiTypeset(pane);
    }
    wrap.querySelector(".pane-title").textContent = tab.title;
    tabs.forEach((t) => {
      const w = document.getElementById("pane-wrap-" + t.id);
      if (w) w.classList.toggle("active", t.id === activeTabId);
    });
    updatePanesLayout();
    buildTOC(pane);
    const activeWrap = document.getElementById("pane-wrap-" + activeTabId);
    if (activeWrap)
      activeWrap.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
  }

  function updatePanesLayout() {
    const width = paneContainer.clientWidth;
    const n = tabs.length;
    if (n === 0) return;
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    tabs.forEach((t) => {
      const w = document.getElementById("pane-wrap-" + t.id);
      if (!w) return;
      if (isMobile) {
        w.classList.toggle("collapsed", false);
        w.classList.toggle("active", t.id === activeTabId);
        return;
      }
      const totalExpanded = n * PANE_WIDTH;
      const needCollapse = n > 1 && totalExpanded > width;
      if (needCollapse) {
        w.classList.toggle("collapsed", t.id !== activeTabId);
      } else {
        w.classList.remove("collapsed");
      }
      w.classList.toggle("active", t.id === activeTabId);
    });
  }

  const wikiPreviewEl = document.getElementById("wiki-preview");
  let wikiPreviewTimeout = null;
  const WIKI_PREVIEW_DELAY_MS = 400;
  const WIKI_PREVIEW_MAX_TEXT = 280;

  function getNotePreview(slug, cb) {
    const tab = tabs.find((t) => t.slug === slug);
    if (tab && tab.html) {
      const title = tab.title;
      const div = document.createElement("div");
      div.innerHTML = tab.html;
      const text = (div.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, WIKI_PREVIEW_MAX_TEXT);
      return cb({
        title,
        text: text + (text.length >= WIKI_PREVIEW_MAX_TEXT ? "…" : ""),
      });
    }
    if (
      staticData &&
      staticData.notes_by_slug &&
      staticData.notes_by_slug[slug]
    ) {
      const d = staticData.notes_by_slug[slug];
      const div = document.createElement("div");
      div.innerHTML = d.html;
      const text = (div.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, WIKI_PREVIEW_MAX_TEXT);
      return cb({
        title: d.title,
        text: text + (text.length >= WIKI_PREVIEW_MAX_TEXT ? "…" : ""),
      });
    }
    fetch(`${API}/note/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data) return cb(null);
        const div = document.createElement("div");
        div.innerHTML = data.html;
        const text = (div.textContent || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, WIKI_PREVIEW_MAX_TEXT);
        cb({
          title: data.title,
          text: text + (text.length >= WIKI_PREVIEW_MAX_TEXT ? "…" : ""),
        });
      })
      .catch(() => cb(null));
  }

  function showWikiPreview(linkEl, slug) {
    getNotePreview(slug, (info) => {
      if (!info || !wikiPreviewEl) return;
      wikiPreviewEl.innerHTML =
        '<div class="wiki-preview-title">' +
        escapeHtml(info.title) +
        "</div>" +
        (info.text
          ? '<div class="wiki-preview-body">' + escapeHtml(info.text) + "</div>"
          : "");
      wikiPreviewEl.setAttribute("aria-hidden", "false");
      requestAnimationFrame(() => {
        const rect = linkEl.getBoundingClientRect();
        const previewRect = wikiPreviewEl.getBoundingClientRect();
        const gap = 8;
        let top = rect.top - previewRect.height - gap;
        if (top < 8) top = rect.bottom + gap;
        let left = rect.left;
        if (left + previewRect.width > window.innerWidth - 8)
          left = window.innerWidth - previewRect.width - 8;
        if (left < 8) left = 8;
        wikiPreviewEl.style.top = top + "px";
        wikiPreviewEl.style.left = left + "px";
      });
    });
  }

  function hideWikiPreview() {
    if (wikiPreviewTimeout) {
      clearTimeout(wikiPreviewTimeout);
      wikiPreviewTimeout = null;
    }
    if (wikiPreviewEl) {
      wikiPreviewEl.setAttribute("aria-hidden", "true");
      wikiPreviewEl.innerHTML = "";
    }
  }

  function attachWikiLinks(paneOrTabId) {
    const paneId = paneOrTabId.startsWith("pane-")
      ? paneOrTabId
      : "pane-" + paneOrTabId;
    const pane = document.getElementById(paneId);
    if (!pane) return;
    pane.querySelectorAll("a.wiki-link").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const page = a.getAttribute("data-wiki-page") || a.textContent.trim();
        const slug = slugify(page);
        openNote(slug, page);
      });
      a.addEventListener("mouseenter", () => {
        hideWikiPreview();
        const page = a.getAttribute("data-wiki-page") || a.textContent.trim();
        const slug = slugify(page);
        if (!slug) return;
        wikiPreviewTimeout = setTimeout(
          () => showWikiPreview(a, slug),
          WIKI_PREVIEW_DELAY_MS,
        );
      });
      a.addEventListener("mouseleave", () => {
        hideWikiPreview();
      });
    });
  }

  function slugify(name) {
    return (
      name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "index"
    );
  }

  /** Fzf-style fuzzy score: query chars must appear in text in order. Higher = better. */
  function fuzzyScore(text, query) {
    if (!query) return 1;
    const t = text.toLowerCase();
    const q = query.toLowerCase();
    let ti = 0;
    let qi = 0;
    let score = 0;
    let run = 0;
    const wordStart = (i) => i === 0 || /[\s\-_]/.test(t[i - 1]);
    while (qi < q.length && ti < t.length) {
      const qc = q[qi];
      const idx = t.indexOf(qc, ti);
      if (idx === -1) return null;
      if (idx === ti) run++;
      else run = 1;
      if (wordStart(idx)) score += 100;
      score += run * 10 + (idx - ti);
      ti = idx + 1;
      qi++;
    }
    if (qi < q.length) return null;
    return score - text.length;
  }

  function openFuzzySearch() {
    fuzzyOverlay.classList.add("open");
    fuzzyOverlay.setAttribute("aria-hidden", "false");
    fuzzyInput.value = "";
    fuzzyInput.focus();
    fuzzySelectedIndex = 0;
    runFuzzySearch();
  }

  function closeFuzzySearch() {
    fuzzyOverlay.classList.remove("open");
    fuzzyOverlay.setAttribute("aria-hidden", "true");
    fuzzyInput.blur();
  }

  function runFuzzySearch() {
    const q = fuzzyInput.value.trim();
    if (!allNotes.length) {
      fuzzyFiltered = [];
      fuzzyResults.innerHTML = '<li class="no-results">No notes loaded.</li>';
      return;
    }
    if (!q) {
      fuzzyFiltered = allNotes
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title));
    } else {
      const withScores = allNotes
        .map((n) => ({ note: n, score: fuzzyScore(n.title, q) }))
        .filter((x) => x.score !== null);
      withScores.sort((a, b) => b.score - a.score);
      fuzzyFiltered = withScores.map((x) => x.note);
    }
    fuzzySelectedIndex = fuzzyFiltered.length
      ? Math.min(fuzzySelectedIndex, fuzzyFiltered.length - 1)
      : 0;
    renderFuzzyResults();
  }

  function renderFuzzyResults() {
    if (fuzzyFiltered.length === 0) {
      fuzzyResults.innerHTML = '<li class="no-results">No matching notes.</li>';
      return;
    }
    fuzzyResults.innerHTML = fuzzyFiltered
      .map(
        (n, i) =>
          '<li role="option" aria-selected="' +
          (i === fuzzySelectedIndex) +
          '" data-index="' +
          i +
          '" data-slug="' +
          escapeAttr(n.slug) +
          '" data-title="' +
          escapeAttr(n.title) +
          '">' +
          escapeHtml(n.title) +
          "</li>",
      )
      .join("");
    fuzzyResults.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => {
        const slug = li.dataset.slug;
        const title = li.dataset.title;
        closeFuzzySearch();
        openNote(slug, title);
      });
    });
    const sel = fuzzyResults.querySelector('[aria-selected="true"]');
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }

  function setFuzzySelected(index) {
    fuzzySelectedIndex = Math.max(0, Math.min(index, fuzzyFiltered.length - 1));
    fuzzyResults.querySelectorAll('[role="option"]').forEach((el, i) => {
      el.setAttribute("aria-selected", i === fuzzySelectedIndex);
    });
    const sel = fuzzyResults.querySelector('[aria-selected="true"]');
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }

  const tocNavEl = document.getElementById("toc-nav");
  const tocSidebarEl = document.getElementById("toc-sidebar");

  function slugifyHeading(text) {
    return (
      text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "section"
    );
  }

  function buildTOC(paneEl) {
    if (!tocNavEl) return;
    const showTOC = function () {
      if (tocSidebarEl) tocSidebarEl.classList.remove("hidden");
    };
    const hideTOC = function () {
      if (tocSidebarEl) tocSidebarEl.classList.add("hidden");
    };
    if (!paneEl) {
      tocNavEl.innerHTML = "";
      hideTOC();
      return;
    }
    const headings = paneEl.querySelectorAll("h1, h2, h3");
    if (headings.length === 0) {
      tocNavEl.innerHTML = "";
      hideTOC();
      return;
    }
    showTOC();
    const nums = [0, 0, 0];
    const items = [];
    headings.forEach((h) => {
      const level = parseInt(h.tagName.charAt(1), 10);
      const text = h.textContent.trim();
      const id = h.id || "toc-" + slugifyHeading(text) + "-" + items.length;
      h.id = id;
      if (level === 1) {
        nums[0]++;
        nums[1] = 0;
        nums[2] = 0;
        items.push({ level: 1, num: String(nums[0]), text, id, cls: "toc-h1" });
      } else if (level === 2) {
        nums[1]++;
        nums[2] = 0;
        items.push({
          level: 2,
          num: nums[0] + "." + nums[1],
          text,
          id,
          cls: "toc-h2",
        });
      } else {
        nums[2]++;
        items.push({
          level: 3,
          num: nums[0] + "." + nums[1] + "." + nums[2],
          text,
          id,
          cls: "toc-h3",
        });
      }
    });
    tocNavEl.innerHTML =
      "<ul>" +
      items
        .map(
          (it) =>
            '<li><a class="' +
            it.cls +
            '" href="#' +
            escapeAttr(it.id) +
            '" data-id="' +
            escapeAttr(it.id) +
            '"><span class="toc-num">' +
            escapeHtml(it.num) +
            "</span>" +
            escapeHtml(it.text) +
            "</a></li>",
        )
        .join("") +
      "</ul>";
    tocNavEl.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const el = paneEl.querySelector("#" + CSS.escape(a.dataset.id));
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function setActiveTab(id) {
    activeTabId = id;
    tabs.forEach((t) => {
      const el = document.querySelector(`[data-tab-id="${t.id}"]`);
      if (el) el.classList.toggle("active", t.id === id);
    });
    const tab = tabs.find((t) => t.id === id);
    if (tab) {
      showPane(tab);
      setNotePath(tab.slug);
    }
    updateStatusPath();
  }

  function closeTab(id, e) {
    if (e) e.stopPropagation();
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    tabs.splice(idx, 1);
    document.getElementById("pane-wrap-" + id)?.remove();
    if (tabs.length === 0) {
      welcomeEl.classList.remove("hidden");
      paneContainer.classList.remove("visible");
      activeTabId = null;
      clearNotePath();
      renderTabBar();
      buildTOC(null);
      updateStatusPath();
      return;
    }
    const next = tabs[idx] || tabs[idx - 1];
    if (next) setActiveTab(next.id);
    else updateStatusPath();
    renderTabBar();
    updatePanesLayout();
  }

  function renderTabBar() {
    const tabBar = document.querySelector(".tab-bar");
    if (tabBar) tabBar.classList.toggle("collapsed", tabs.length > 0);
    tabsEl.innerHTML = "";
    tabs.forEach((tab) => {
      const tabEl = document.createElement("div");
      tabEl.id = tab.id;
      tabEl.className = "tab" + (tab.id === activeTabId ? " active" : "");
      tabEl.setAttribute("data-tab-id", tab.id);
      tabEl.setAttribute("role", "tab");
      tabEl.setAttribute("aria-selected", tab.id === activeTabId);
      tabEl.innerHTML =
        '<span class="tab-title">' +
        escapeHtml(tab.title) +
        '</span><button type="button" class="tab-close" aria-label="Close tab">×</button>';
      tabEl
        .querySelector(".tab-title")
        .addEventListener("click", () => setActiveTab(tab.id));
      tabEl
        .querySelector(".tab-close")
        .addEventListener("click", (e) => closeTab(tab.id, e));
      tabsEl.appendChild(tabEl);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  openVaultBtn.addEventListener("click", () => {
    sidebarEl.classList.toggle("open");
    sidebarEl.setAttribute(
      "aria-hidden",
      !sidebarEl.classList.contains("open"),
    );
  });

  closeSidebarBtn.addEventListener("click", () => {
    sidebarEl.classList.remove("open");
    sidebarEl.setAttribute("aria-hidden", "true");
  });

  fuzzyInput.addEventListener("input", runFuzzySearch);
  fuzzyInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFuzzySelected(fuzzySelectedIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFuzzySelected(fuzzySelectedIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const note = fuzzyFiltered[fuzzySelectedIndex];
      if (note) {
        closeFuzzySearch();
        openNote(note.slug, note.title);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeFuzzySearch();
    }
  });
  fuzzyOverlay.addEventListener("click", (e) => {
    if (e.target === fuzzyOverlay) closeFuzzySearch();
  });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      if (fuzzyOverlay.classList.contains("open")) closeFuzzySearch();
      else openFuzzySearch();
    }
  });

  window.addEventListener("resize", updatePanesLayout);

  const welcomeSectionsEl = document.getElementById("welcome-sections");
  const CARDS_PER_PAGE = 8;
  let latestCardsAll = [];
  let cardsPage = 0;

  function renderCards(cards) {
    const cardsGrid = document.getElementById("cards-grid");
    if (!cardsGrid) return;
    latestCardsAll = cards || [];
    cardsPage = 0;
    renderCardsPage();
  }

  function renderCardsPage() {
    const cardsGrid = document.getElementById("cards-grid");
    const cardsPaginationEl = document.getElementById("cards-pagination");
    if (!cardsGrid) return;
    if (latestCardsAll.length === 0) {
      cardsGrid.innerHTML = "";
      if (cardsPaginationEl) cardsPaginationEl.innerHTML = "";
      return;
    }
    const totalPages = Math.ceil(latestCardsAll.length / CARDS_PER_PAGE);
    const start = cardsPage * CARDS_PER_PAGE;
    const pageCards = latestCardsAll.slice(start, start + CARDS_PER_PAGE);
    cardsGrid.innerHTML = pageCards
      .map(
        (c) =>
          '<a class="card" href="#" data-slug="' +
          escapeAttr(c.slug) +
          '" data-title="' +
          escapeAttr(c.title) +
          '" role="article">' +
          '<h3 class="card-title">' +
          escapeHtml(c.title) +
          "</h3>" +
          '<p class="card-meta">Last Updated: ' +
          escapeHtml(c.last_updated) +
          "</p>" +
          '<p class="card-preview">' +
          escapeHtml(c.preview) +
          "</p>" +
          "</a>",
      )
      .join("");
    cardsGrid.querySelectorAll(".card").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        openNote(el.dataset.slug, el.dataset.title);
      });
    });
    if (cardsPaginationEl) {
      if (totalPages <= 1) {
        cardsPaginationEl.innerHTML = "";
        cardsPaginationEl.classList.add("hidden");
      } else {
        cardsPaginationEl.classList.remove("hidden");
        const prevDisabled = cardsPage <= 0;
        const nextDisabled = cardsPage >= totalPages - 1;
        cardsPaginationEl.innerHTML =
          '<button type="button" class="cards-pagination-btn" data-action="prev" ' +
          (prevDisabled ? "disabled" : "") +
          ">[ previous ]</button>" +
          '<span class="cards-pagination-info">' +
          (cardsPage + 1) +
          " / " +
          totalPages +
          "</span>" +
          '<button type="button" class="cards-pagination-btn" data-action="next" ' +
          (nextDisabled ? "disabled" : "") +
          ">[ next ]</button>";
        cardsPaginationEl
          .querySelectorAll(".cards-pagination-btn")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              if (btn.dataset.action === "prev" && cardsPage > 0) {
                cardsPage--;
                renderCardsPage();
              } else if (
                btn.dataset.action === "next" &&
                cardsPage < totalPages - 1
              ) {
                cardsPage++;
                renderCardsPage();
              }
            });
          });
      }
    }
  }

  function loadLatestCards() {
    const cardsGrid = document.getElementById("cards-grid");
    const cardsPaginationEl = document.getElementById("cards-pagination");
    if (!cardsGrid) return;
    if (staticData && staticData.latest) {
      renderCards(staticData.latest);
      return;
    }
    fetch(API + "/notes/latest")
      .then((r) => r.json())
      .then(renderCards)
      .catch(() => {
        latestCardsAll = [];
        const grid = document.getElementById("cards-grid");
        const pag = document.getElementById("cards-pagination");
        if (grid) grid.innerHTML = "";
        if (pag) pag.innerHTML = "";
      });
  }

  function sectionPathForType(type) {
    if (type === "notes") return "notes";
    if (type === "books") return "books";
    return type;
  }

  function buildWelcomeSections(config) {
    if (!welcomeSectionsEl) return;
    const sections =
      config && config.sections && config.sections.length
        ? config.sections
        : [{ id: "latest", type: "notes", title: "Posts" }];
    const sectionLinksEl = document.getElementById("welcome-section-links");
    const sectionSepEl = document.getElementById("welcome-section-sep");
    const sidebarSectionsEl = document.getElementById("sidebar-sections");
    const sectionList = sections.filter(
      (s) =>
        s.type === "notes" || (s.type === "books" && s.items && s.items.length),
    );
    if (sidebarSectionsEl && sectionList.length > 0) {
      sidebarSectionsEl.innerHTML = sectionList
        .map((sec) => {
          const path = sectionPathForType(sec.type);
          return (
            '<a href="/' +
            encodeURI(path) +
            '" class="sidebar-section-link" data-path="' +
            escapeAttr(path) +
            '" data-scroll="' +
            escapeAttr(
              sec.type === "notes" ? "latest-section" : "books-section",
            ) +
            '">' +
            escapeHtml(sec.title) +
            "</a>"
          );
        })
        .join("");
      sidebarSectionsEl
        .querySelectorAll(".sidebar-section-link")
        .forEach((a) => {
          a.addEventListener("click", (e) => {
            e.preventDefault();
            const path = a.getAttribute("data-path");
            const scrollId = a.getAttribute("data-scroll");
            sidebarEl.classList.remove("open");
            sidebarEl.setAttribute("aria-hidden", "true");
            if (path && location.pathname !== "/" + path)
              history.pushState({ section: path }, "", "/" + path);
            if (scrollId)
              document
                .getElementById(scrollId)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            updateStatusPath();
            welcomeEl.classList.remove("hidden");
            paneContainer.classList.remove("visible");
          });
        });
    }
    if (sectionLinksEl && sectionList.length > 0) {
      const linkParts = sectionList.map((sec) => {
        const path = sectionPathForType(sec.type);
        const sectionId =
          sec.type === "notes" ? "latest-section" : "books-section";
        return (
          '<a href="/' +
          encodeURI(path) +
          '" class="section-link" data-path="' +
          escapeAttr(path) +
          '" data-scroll="' +
          escapeAttr(sectionId) +
          '">' +
          escapeHtml(sec.title) +
          "</a>"
        );
      });
      sectionLinksEl.innerHTML = linkParts.join(
        '<span class="welcome-sep">·</span>',
      );
      sectionSepEl.style.display = "";
      sectionLinksEl.querySelectorAll(".section-link").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const path = a.getAttribute("data-path");
          const scrollId = a.getAttribute("data-scroll");
          if (path && location.pathname !== "/" + path)
            history.pushState({ section: path }, "", "/" + path);
          if (scrollId)
            document
              .getElementById(scrollId)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          updateStatusPath();
        });
      });
    } else if (sectionSepEl) sectionSepEl.style.display = "none";
    welcomeSectionsEl.innerHTML = "";
    sections.forEach((sec) => {
      const sectionEl = document.createElement("section");
      sectionEl.className = "home-section";
      sectionEl.setAttribute("aria-label", sec.title);
      const h2 = document.createElement("h2");
      h2.className = "home-section-title";
      h2.textContent = sec.title;
      sectionEl.appendChild(h2);
      if (sec.type === "notes") {
        sectionEl.id = "latest-section";
        const wrap = document.createElement("div");
        wrap.className = "cards-section";
        wrap.innerHTML =
          '<div class="cards-grid" id="cards-grid"></div><nav class="cards-pagination hidden" id="cards-pagination" aria-label="Latest posts navigation"></nav>';
        sectionEl.appendChild(wrap);
        welcomeSectionsEl.appendChild(sectionEl);
        loadLatestCards();
      } else if (sec.type === "books" && sec.items && sec.items.length) {
        sectionEl.id = "books-section";
        const grid = document.createElement("div");
        grid.className = "books-grid";
        grid.innerHTML = sec.items
          .map(
            (b) =>
              '<a class="book-card" href="' +
              escapeAttr(b.url) +
              '" target="_blank" rel="noopener noreferrer" role="article">' +
              (b.cover
                ? '<img class="book-cover" src="' +
                  escapeAttr(b.cover) +
                  '" alt="" />'
                : "") +
              '<h3 class="book-title">' +
              escapeHtml(b.title) +
              "</h3>" +
              (b.subtitle
                ? '<p class="book-subtitle">' + escapeHtml(b.subtitle) + "</p>"
                : "") +
              "</a>",
          )
          .join("");
        sectionEl.appendChild(grid);
        welcomeSectionsEl.appendChild(sectionEl);
      }
    });
    const path = location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    if (path === "notes")
      document
        .getElementById("latest-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (path === "books")
      document
        .getElementById("books-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderNoteList(notes) {
    allNotes = notes;
    noteListEl.innerHTML = notes
      .map(
        (n) =>
          '<li><a href="#" data-slug="' +
          escapeAttr(n.slug) +
          '" data-title="' +
          escapeAttr(n.title) +
          '">' +
          escapeHtml(n.title) +
          "</a></li>",
      )
      .join("");
    noteListEl.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openNote(a.dataset.slug, a.dataset.title);
        sidebarEl.classList.remove("open");
        sidebarEl.setAttribute("aria-hidden", "true");
      });
    });
  }

  function loadNoteList() {
    fetch(API + "/notes")
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error("API not available");
      })
      .then((notes) => {
        renderNoteList(notes);
        return fetch(API + "/sections").then((r) =>
          r.ok
            ? r.json()
            : { sections: [{ id: "latest", type: "notes", title: "Posts" }] },
        );
      })
      .then((sectionsConfig) => {
        buildWelcomeSections(sectionsConfig);
      })
      .catch(() => {
        fetch("notes.json")
          .then((r) => r.json())
          .then((data) => {
            staticData = data;
            if (data.notes) renderNoteList(data.notes);
            buildWelcomeSections(
              data.sections ? { sections: data.sections } : data,
            );
          })
          .catch(() => {
            noteListEl.innerHTML =
              '<li class="text-muted">Could not load notes.</li>';
            buildWelcomeSections({
              sections: [{ id: "latest", type: "notes", title: "Posts" }],
            });
          });
      });
  }

  function escapeAttr(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML.replace(/"/g, "&quot;");
  }

  const statusPathEl = document.getElementById("status-path");
  const statusPathWrapEl = document.getElementById("status-path-wrap");
  const STATUS_PATH_MAX_LEN = 32;

  if (statusPathWrapEl) {
    statusPathWrapEl.addEventListener("click", () => {
      const url = location.href;
      navigator.clipboard.writeText(url).then(
        () => {
          statusPathWrapEl.setAttribute("title", "Copied!");
          setTimeout(() => {
            if (statusPathEl.getAttribute("title")) statusPathWrapEl.setAttribute("title", "Click to copy link");
          }, 1500);
        },
        () => {}
      );
    });
    statusPathWrapEl.setAttribute("role", "button");
  }

  function truncatePath(seg) {
    if (!seg || seg.length <= STATUS_PATH_MAX_LEN) return seg;
    const half = Math.floor((STATUS_PATH_MAX_LEN - 1) / 2);
    return seg.slice(0, half) + "…" + seg.slice(-half);
  }

  function updateStatusPath() {
    if (!statusPathEl) return;
    let seg = "";
    if (tabs.length > 0 && activeTabId) {
      const tab = tabs.find((t) => t.id === activeTabId);
      if (tab) seg = "note/" + tab.slug;
    } else {
      const path = location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      seg = path === "notes" || path === "books" ? path : path || "";
    }
    const statusChevronPathEl = document.getElementById("status-chevron-path");
    if (statusPathWrapEl) statusPathWrapEl.classList.toggle("hidden", !seg);
    if (seg) {
      const parts = seg.split("/").filter(Boolean);
      const html = parts
        .map((s, i) => {
          const text = i === parts.length - 1 ? truncatePath(s) : s;
          const lastClass = i === parts.length - 1 ? " status-path-seg-last" : "";
          return (
            '<span class="status-path-seg' + lastClass + '">' +
            escapeHtml(text) +
            "</span>"
          );
        })
        .join("");
      statusPathEl.innerHTML = html;
      statusPathEl.setAttribute("title", seg);
      if (statusPathWrapEl) statusPathWrapEl.setAttribute("title", "Click to copy link");
      if (statusChevronPathEl) {
        statusChevronPathEl.className =
          "status-chevron status-chevron-path" +
          (parts.length ? " status-chevron-path--last" : "");
      }
    } else {
      statusPathEl.innerHTML = "";
      statusPathEl.removeAttribute("title");
      if (statusPathWrapEl) statusPathWrapEl.removeAttribute("title");
      if (statusChevronPathEl) statusChevronPathEl.className = "status-chevron status-chevron-path";
    }
  }

  function applyPath() {
    const path = location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    if (path === "notes" || path === "books") {
      welcomeEl.classList.remove("hidden");
      paneContainer.classList.remove("visible");
      requestAnimationFrame(() => {
        const id = path === "notes" ? "latest-section" : "books-section";
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      updateStatusPath();
      return;
    }
    const slug = parseNotePath();
    if (!slug) {
      welcomeEl.classList.remove("hidden");
      paneContainer.classList.remove("visible");
      updateStatusPath();
      return;
    }
    welcomeEl.classList.add("hidden");
    paneContainer.classList.add("visible");
    const existing = tabs.find((t) => t.slug === slug);
    if (existing) {
      setActiveTab(existing.id);
    } else {
      openNote(slug, slug);
    }
    updateStatusPath();
  }

  window.addEventListener("popstate", applyPath);

  loadNoteList();
  applyPath();

  window.wiki = { openNote, closeTab, setActiveTab };
})();
