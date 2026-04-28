(function () {
  const API = "/api";
  const tabsEl = document.querySelector(".tabs");
  const paneContainer = document.getElementById("pane-container");
  const welcomeEl = document.getElementById("welcome");
  const sidebarEl = document.getElementById("sidebar");
  const noteListEl = document.getElementById("note-list");
  const openVaultBtn = document.querySelector(".open-vault");
  const closeSidebarBtn = document.querySelector(".close-sidebar");
  const themeCycleBtn = document.getElementById("theme-cycle");
  const fuzzyOverlay = document.getElementById("fuzzy-overlay");
  const fuzzyInput = document.getElementById("fuzzy-input");
  const fuzzyResults = document.getElementById("fuzzy-results");
  const graphSvg = document.getElementById("graph-svg");
  const graphModalOverlay = document.getElementById("graph-modal-overlay");
  const graphModalSvg = document.getElementById("graph-modal-svg");
  const closeGraphModalBtn = document.querySelector(".close-graph-modal");
  const graphHeaderEl = document.getElementById("graph-header");
  const graphSidebarEl = document.getElementById("graph-sidebar");

  let tabs = [];
  let activeTabId = null;
  let allNotes = [];
  let staticData = window.__WIKI_PRELOADED || null;
  const staticFlat = Boolean(window.__WIKI_STATIC_FLAT);
  let fuzzySelectedIndex = 0;
  let fuzzyFiltered = [];
  let graphData = staticData && staticData.graph ? staticData.graph : null;
  let themeMode = "system";
  const graphViewportState = new WeakMap();

  function tabId(slug) {
    return "tab-" + slug;
  }

  function applyTheme(mode) {
    themeMode = mode === "light" || mode === "dark" ? mode : "system";
    if (themeMode === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", themeMode);
    }
    try {
      localStorage.setItem("wiki-theme-mode", themeMode);
    } catch (e) {}
    if (themeCycleBtn) {
      const icons = { system: "💻", light: "☀", dark: "🌙" };
      themeCycleBtn.textContent = "[" + (icons[themeMode] || "💻") + "]";
      themeCycleBtn.setAttribute("title", "Theme: " + themeMode);
      themeCycleBtn.setAttribute("aria-label", "Theme mode: " + themeMode);
    }
  }

  function initTheme() {
    let stored = "system";
    try {
      stored = localStorage.getItem("wiki-theme-mode") || "system";
    } catch (e) {}
    applyTheme(stored);
    if (themeCycleBtn) {
      const order = ["system", "light", "dark"];
      themeCycleBtn.addEventListener("click", () => {
        const idx = order.indexOf(themeMode);
        const next = order[(idx + 1) % order.length];
        applyTheme(next);
      });
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", () => {
      if (themeMode === "system") {
        document.documentElement.removeAttribute("data-theme");
      }
    });
  }

  function parseNotePath() {
    const path = location.pathname.replace(/^\/+|\/+$/g, "");
    if (!path || path === "notes" || path === "books") return null;
    if (path.startsWith("api/") || path.startsWith("static/")) return null;
    const segs = path.split("/");
    if (segs[0] === "note") return decodeURIComponent(segs[1] || "");
    return decodeURIComponent(segs[segs.length - 1] || "");
  }

  function setNotePath(slug) {
    const path = "/" + encodeURIComponent(slug) + "/";
    if (location.pathname !== path) history.pushState({ slug }, "", path);
  }

  function colorForTag(tag) {
    const palette = {
      ai: "#f6c177",
      ml: "#ebbcba",
      story: "#9ccfd8",
      systems: "#c4a7e7",
      life: "#f2cdcd",
      general: "#6e6a86",
    };
    const key = (tag || "general").toLowerCase();
    return palette[key] || "#31748f";
  }

  function ensureGraphData() {
    if (graphData) return Promise.resolve(graphData);
    return fetch(API + "/graph")
      .then((r) => r.json())
      .then((data) => {
        graphData = data;
        return data;
      });
  }

  function renderGraph(svgEl, data, activeSlug, large) {
    if (!svgEl || !data || !Array.isArray(data.nodes)) return;
    const width = svgEl.clientWidth || (large ? 900 : 220);
    const height = svgEl.clientHeight || (large ? 620 : 200);
    const nodes = data.nodes
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((n, i) => ({ ...n, i }));
    const edges = Array.isArray(data.edges) ? data.edges : [];
    const bySlug = new Map();
    const pad = large ? 36 : 16;
    const innerW = Math.max(1, width - pad * 2);
    const innerH = Math.max(1, height - pad * 2);

    // Initialize with deterministic pseudo-random positions for stable layouts.
    function hash01(s) {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return ((h >>> 0) % 10000) / 10000;
    }
    nodes.forEach((n) => {
      const rx = hash01(n.slug + "x");
      const ry = hash01(n.slug + "y");
      n.x = pad + rx * innerW;
      n.y = pad + ry * innerH;
      bySlug.set(n.slug, n);
    });

    // Lightweight force-directed layout for a Quartz-like network look.
    const k = Math.sqrt((innerW * innerH) / Math.max(nodes.length, 1));
    const iterations = large ? 220 : 120;
    let temp = Math.min(innerW, innerH) * (large ? 0.2 : 0.14);
    const edgePairs = edges
      .map((e) => [bySlug.get(e.source), bySlug.get(e.target)])
      .filter((pair) => pair[0] && pair[1]);

    for (let iter = 0; iter < iterations; iter++) {
      nodes.forEach((n) => {
        n.dx = 0;
        n.dy = 0;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist = Math.hypot(dx, dy) || 0.001;
          const force = (k * k) / dist;
          dx /= dist;
          dy /= dist;
          a.dx += dx * force;
          a.dy += dy * force;
          b.dx -= dx * force;
          b.dy -= dy * force;
        }
      }
      edgePairs.forEach(([a, b]) => {
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.hypot(dx, dy) || 0.001;
        const force = (dist * dist) / k;
        dx /= dist;
        dy /= dist;
        a.dx -= dx * force;
        a.dy -= dy * force;
        b.dx += dx * force;
        b.dy += dy * force;
      });
      nodes.forEach((n) => {
        const disp = Math.hypot(n.dx, n.dy) || 0.001;
        const step = Math.min(disp, temp);
        n.x += (n.dx / disp) * step;
        n.y += (n.dy / disp) * step;
        n.x = Math.max(pad, Math.min(width - pad, n.x));
        n.y = Math.max(pad, Math.min(height - pad, n.y));
      });
      temp *= 0.985;
    }
    const lines = edges
      .map((e) => {
        const s = bySlug.get(e.source);
        const t = bySlug.get(e.target);
        if (!s || !t) return "";
        return (
          '<line x1="' +
          s.x.toFixed(1) +
          '" y1="' +
          s.y.toFixed(1) +
          '" x2="' +
          t.x.toFixed(1) +
          '" y2="' +
          t.y.toFixed(1) +
          '" stroke="rgba(110,106,134,0.35)" stroke-width="1" />'
        );
      })
      .join("");
    const dots = nodes
      .map((n) => {
        const tag = Array.isArray(n.tags) && n.tags.length ? n.tags[0] : "general";
        return (
          '<g class="graph-node" data-slug="' +
          escapeAttr(n.slug) +
          '" data-title="' +
          escapeAttr(n.title) +
          '" data-x="' +
          n.x.toFixed(1) +
          '" data-y="' +
          n.y.toFixed(1) +
          '">' +
          '<circle cx="' +
          n.x.toFixed(1) +
          '" cy="' +
          n.y.toFixed(1) +
          '" r="' +
          (n.slug === activeSlug ? (large ? "8" : "6.5") : large ? "5.5" : "4.5") +
          '" fill="' +
          colorForTag(tag) +
          '" stroke="' +
          (n.slug === activeSlug ? "var(--accent)" : "transparent") +
          '" stroke-width="2" />' +
          '<title>' +
          escapeHtml(n.title) +
          " [" +
          escapeHtml(tag) +
          "]</title>" +
          "</g>"
        );
      })
      .join("");
    const labels = nodes
      .map(
        (n) =>
          '<text class="graph-label" data-slug="' +
          escapeAttr(n.slug) +
          '" data-title="' +
          escapeAttr(n.title) +
          '" x="' +
          n.x.toFixed(1) +
          '" y="' +
          (n.y + (large ? 14 : 11)).toFixed(1) +
          '">' +
          escapeHtml(n.title) +
          "</text>",
      )
      .join("");
    svgEl.innerHTML =
      '<g class="graph-viewport">' + lines + dots + labels + "</g>";

    const state = {
      x: 0,
      y: 0,
      zoom: 1,
      minZoom: 0.5,
      maxZoom: 4,
      labelZoom: large ? 1.3 : 1.8,
      dragging: false,
      dragStartX: 0,
      dragStartY: 0,
      startX: 0,
      startY: 0,
    };
    graphViewportState.set(svgEl, state);

    function applyViewport() {
      const s = graphViewportState.get(svgEl);
      if (!s) return;
      const viewport = svgEl.querySelector(".graph-viewport");
      if (viewport) {
        viewport.setAttribute(
          "transform",
          "translate(" + s.x.toFixed(1) + " " + s.y.toFixed(1) + ") scale(" + s.zoom.toFixed(3) + ")",
        );
      }
      svgEl
        .querySelectorAll(".graph-label")
        .forEach((lbl) => lbl.classList.toggle("visible", s.zoom >= s.labelZoom));
    }

    applyViewport();

    svgEl.onwheel = (e) => {
      e.preventDefault();
      const s = graphViewportState.get(svgEl);
      if (!s) return;
      const rect = svgEl.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const prevZoom = s.zoom;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      s.zoom = Math.max(s.minZoom, Math.min(s.maxZoom, s.zoom * factor));
      const ratio = s.zoom / prevZoom;
      s.x = mx - (mx - s.x) * ratio;
      s.y = my - (my - s.y) * ratio;
      applyViewport();
    };

    svgEl.onpointerdown = (e) => {
      if (e.target.closest(".graph-node")) return;
      const s = graphViewportState.get(svgEl);
      if (!s) return;
      s.dragging = true;
      s.dragStartX = e.clientX;
      s.dragStartY = e.clientY;
      s.startX = s.x;
      s.startY = s.y;
      svgEl.setPointerCapture(e.pointerId);
    };

    svgEl.onpointermove = (e) => {
      const s = graphViewportState.get(svgEl);
      if (!s || !s.dragging) return;
      s.x = s.startX + (e.clientX - s.dragStartX);
      s.y = s.startY + (e.clientY - s.dragStartY);
      applyViewport();
    };

    svgEl.onpointerup = (e) => {
      const s = graphViewportState.get(svgEl);
      if (!s) return;
      s.dragging = false;
      try {
        svgEl.releasePointerCapture(e.pointerId);
      } catch (err) {}
    };

    svgEl.querySelectorAll(".graph-node").forEach((n) => {
      n.addEventListener("click", () => {
        closeGraphModal();
        openNote(n.dataset.slug, n.dataset.title);
      });
      n.addEventListener("mouseenter", () => {
        hideWikiPreview();
        wikiPreviewTimeout = setTimeout(
          () => showWikiPreview(n, n.dataset.slug),
          WIKI_PREVIEW_DELAY_MS,
        );
      });
      n.addEventListener("mouseleave", () => {
        hideWikiPreview();
      });
    });
    svgEl.querySelectorAll(".graph-label").forEach((lbl) => {
      lbl.addEventListener("click", () => {
        closeGraphModal();
        openNote(lbl.dataset.slug, lbl.dataset.title);
      });
      lbl.addEventListener("mouseenter", () => {
        hideWikiPreview();
        wikiPreviewTimeout = setTimeout(
          () => showWikiPreview(lbl, lbl.dataset.slug),
          WIKI_PREVIEW_DELAY_MS,
        );
      });
      lbl.addEventListener("mouseleave", () => {
        hideWikiPreview();
      });
    });
  }

  function openGraphModal() {
    if (!graphModalOverlay) return;
    const activeTab = tabs.find((t) => t.id === activeTabId) || null;
    graphModalOverlay.classList.add("open");
    graphModalOverlay.setAttribute("aria-hidden", "false");
    ensureGraphData()
      .then((data) => renderGraph(graphModalSvg, data, activeTab && activeTab.slug, true))
      .catch(() => {});
  }

  function closeGraphModal() {
    if (!graphModalOverlay) return;
    graphModalOverlay.classList.remove("open");
    graphModalOverlay.setAttribute("aria-hidden", "true");
  }

  function renderSidebarGraph(tab) {
    if (!tab) {
      if (graphSvg) graphSvg.innerHTML = "";
      rightSidebarHasGraph = false;
      updateRightSidebarVisibility();
      return;
    }
    ensureGraphData()
      .then((data) => {
        rightSidebarHasGraph = true;
        updateRightSidebarVisibility();
        renderGraph(graphSvg, data, tab.slug, false);
      })
      .catch(() => {
        rightSidebarHasGraph = false;
        updateRightSidebarVisibility();
      });
  }

  function clearNotePath() {
    if (location.pathname !== "/") history.replaceState({}, "", "/");
  }

  function openNote(slug, title, options = {}) {
    if (staticFlat) {
      const target = "/" + encodeURIComponent(slug) + "/";
      if (location.pathname !== target) {
        location.assign(target);
        return;
      }
    }
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
      backlinks: [],
      loaded: false,
    };
    tabs.push(tab);
    renderTabBar();
    setActiveTab(id);
    setNotePath(slug);
    loadNoteContent(tab);
  }

  function loadNoteContent(tab) {
    if (staticFlat && staticData && staticData.current_note) {
      const data = staticData.current_note;
      if (data.slug === tab.slug) {
        tab.title = data.title;
        tab.html = data.html;
        tab.extra_info = data.extra_info ?? null;
        tab.backlinks = data.backlinks || [];
        tab.loaded = true;
        showPane(tab);
        renderBacklinksSidebar(tab);
        renderSidebarGraph(tab);
        updateTabTitle(tab);
        attachWikiLinks(tab.id);
        return;
      }
      location.assign("/" + encodeURIComponent(tab.slug) + "/");
      return;
    }
    if (tab.loaded && tab.html !== null) {
      showPane(tab);
      return;
    }
    fetch(`${API}/note/${encodeURIComponent(tab.slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data) {
          tab.title = tab.slug;
          tab.html = "<p>Note not found.</p>";
          tab.extra_info = null;
          tab.backlinks = [];
        } else {
          tab.title = data.title;
          tab.html = data.html;
          tab.extra_info = data.extra_info ?? null;
          tab.backlinks = data.backlinks || [];
        }
        tab.loaded = true;
        showPane(tab);
        renderBacklinksSidebar(tab);
        renderSidebarGraph(tab);
        updateTabTitle(tab);
        attachWikiLinks(tab.id);
      })
      .catch(() => {
        tab.html = "<p>Failed to load note.</p>";
        tab.backlinks = [];
        tab.loaded = true;
        showPane(tab);
        renderBacklinksSidebar(tab);
        renderSidebarGraph(tab);
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
      const backlinks =
        tab.backlinks && tab.backlinks.length
          ? '<section class="backlinks"><h3>Backlinks</h3><ul class="backlinks-list">' +
            tab.backlinks
              .map(
                (b) =>
                  '<li><a href="' +
                  "/" + encodeURIComponent(b.slug) + "/" +
                  '" class="wiki-link" data-wiki-page="' +
                  escapeAttr(b.title) +
                  '">' +
                  escapeHtml(b.title) +
                  "</a></li>",
              )
              .join("") +
            "</ul></section>"
          : "";
      pane.innerHTML = preface + (tab.html || "") + backlinks;
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
    if (staticFlat && staticData && staticData.current_note) {
      const d = staticData.current_note;
      if (d.slug === slug) {
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
      if (Array.isArray(staticData.latest)) {
        const card = staticData.latest.find((n) => n.slug === slug);
        if (card)
          return cb({
            title: card.title,
            text:
              (card.preview || "").slice(0, WIKI_PREVIEW_MAX_TEXT) +
              ((card.preview || "").length >= WIKI_PREVIEW_MAX_TEXT ? "…" : ""),
          });
      }
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
    const isInternalNoteHref = (href) => {
      if (!href) return false;
      if (!href.startsWith("/")) return false;
      if (href.startsWith("/api/") || href.startsWith("/static/")) return false;
      if (href === "/" || href === "/notes" || href === "/books") return false;
      return true;
    };
    const slugFromInternalHref = (href) => {
      const path = href.replace(/^\/+|\/+$/g, "");
      if (!path) return null;
      const segs = path.split("/");
      if (segs[0] === "note") return decodeURIComponent(segs[1] || "");
      return decodeURIComponent(segs[segs.length - 1] || "");
    };
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
    pane.querySelectorAll("a[href]").forEach((a) => {
      if (a.classList.contains("wiki-link")) return;
      const href = a.getAttribute("href");
      if (!isInternalNoteHref(href)) return;
      const slug = slugFromInternalHref(href);
      if (!slug) return;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openNote(slug, a.textContent.trim() || slug);
      });
      a.addEventListener("mouseenter", () => {
        hideWikiPreview();
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
  const tocHeaderEl = document.getElementById("toc-header");
  const backlinksHeaderEl = document.getElementById("backlinks-header");
  const backlinksNavEl = document.getElementById("backlinks-nav");
  let rightSidebarHasToc = false;
  let rightSidebarHasBacklinks = false;
  let rightSidebarHasGraph = false;

  function updateRightSidebarVisibility() {
    if (!tocSidebarEl) return;
    const showSidebar = rightSidebarHasToc || rightSidebarHasBacklinks || rightSidebarHasGraph;
    tocSidebarEl.classList.toggle("hidden", !showSidebar);
    if (tocHeaderEl) tocHeaderEl.classList.toggle("hidden", !rightSidebarHasToc);
    if (tocNavEl) tocNavEl.classList.toggle("hidden", !rightSidebarHasToc);
    if (backlinksHeaderEl)
      backlinksHeaderEl.classList.toggle("hidden", !rightSidebarHasBacklinks);
    if (backlinksNavEl)
      backlinksNavEl.classList.toggle("hidden", !rightSidebarHasBacklinks);
    if (graphHeaderEl) graphHeaderEl.classList.toggle("hidden", !rightSidebarHasGraph);
    if (graphSidebarEl) graphSidebarEl.classList.toggle("hidden", !rightSidebarHasGraph);
  }

  function renderBacklinksSidebar(tab) {
    if (!backlinksNavEl) return;
    const backlinks = (tab && tab.backlinks) || [];
    if (!backlinks.length) {
      backlinksNavEl.innerHTML = "";
      rightSidebarHasBacklinks = false;
      updateRightSidebarVisibility();
      return;
    }
    backlinksNavEl.innerHTML =
      "<ul>" +
      backlinks
        .map(
          (b) =>
            '<li><a href="/' +
            encodeURIComponent(b.slug) +
            '/" data-slug="' +
            escapeAttr(b.slug) +
            '" data-title="' +
            escapeAttr(b.title) +
            '">' +
            escapeHtml(b.title) +
            "</a></li>",
        )
        .join("") +
      "</ul>";
    backlinksNavEl.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openNote(a.dataset.slug, a.dataset.title);
      });
    });
    rightSidebarHasBacklinks = true;
    updateRightSidebarVisibility();
  }

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
    if (!paneEl) {
      tocNavEl.innerHTML = "";
      rightSidebarHasToc = false;
      updateRightSidebarVisibility();
      return;
    }
    const headings = paneEl.querySelectorAll("h1, h2, h3");
    if (headings.length === 0) {
      tocNavEl.innerHTML = "";
      rightSidebarHasToc = false;
      updateRightSidebarVisibility();
      return;
    }
    rightSidebarHasToc = true;
    updateRightSidebarVisibility();
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
      renderBacklinksSidebar(tab);
      renderSidebarGraph(tab);
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
      renderBacklinksSidebar(null);
      renderSidebarGraph(null);
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
  if (graphHeaderEl) graphHeaderEl.addEventListener("click", openGraphModal);
  if (closeGraphModalBtn) closeGraphModalBtn.addEventListener("click", closeGraphModal);
  if (graphModalOverlay) {
    graphModalOverlay.addEventListener("click", (e) => {
      if (e.target === graphModalOverlay) closeGraphModal();
    });
  }

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
    if (e.key === "Escape") {
      closeGraphModal();
    }
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
    if (staticFlat && staticData) {
      if (staticData.notes) renderNoteList(staticData.notes);
      const sectionsArray =
        staticData.sections && Array.isArray(staticData.sections.sections)
          ? staticData.sections.sections
          : staticData.sections;
      buildWelcomeSections(
        sectionsArray != null ? { sections: sectionsArray } : staticData,
      );
      return;
    }
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
        noteListEl.innerHTML = '<li class="text-muted">Could not load notes.</li>';
        buildWelcomeSections({
          sections: [{ id: "latest", type: "notes", title: "Posts" }],
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
  initTheme();
  applyPath();

  window.wiki = { openNote, closeTab, setActiveTab };
})();
