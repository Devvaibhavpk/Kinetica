// sidebar.js — Kinetica Control Room  
// Renders the unified sidebar nav and live IST clock on every page.

(function () {
  const MODULES = [
    { key: "command_center_overview",    icon: "dashboard",     label: "Network Overview"   },
    { key: "intersection_detail_ix_104", icon: "schema",        label: "Intersection IX-104"},
    { key: "green_wave_corridor_view",   icon: "route",         label: "Green Wave"         },
    { key: "vision_feed_monitor",        icon: "videocam",      label: "Vision Feed"        },
    { key: "analytics_validation",       icon: "analytics",     label: "Analytics"          },
    { key: "benchmarks_system_health",   icon: "monitor_heart", label: "System Health"      },
  ];

  // ── Resolve relative path to assets ──────────────────────────────────
  const currentPath = window.location.pathname;
  const depth = (currentPath.match(/\//g) || []).length - 1;
  // index.html is at depth 1 (e.g. /uiux draft/index.html)
  // page/code.html is at depth 2
  const prefix = depth <= 1 ? "./" : "../";

  function isActive(key) {
    return currentPath.includes(key);
  }

  // ── Build nav items ───────────────────────────────────────────────────
  const navItems = MODULES.map(m => {
    const active = isActive(m.key);
    return `
      <a href="${prefix}${m.key}/code.html"
         title="${m.label}"
         class="nav-item${active ? " active" : ""}"
         style="position:relative;">
        <span class="material-symbols-rounded" style="font-size:20px;">${m.icon}</span>
        <span class="nav-tooltip">${m.label}</span>
      </a>`;
  }).join("\n");

  // ── Sidebar HTML ──────────────────────────────────────────────────────
  const sidebarHTML = `
<style>
  .kinetica-sidebar {
    position: fixed;
    top: 0; left: 0;
    width: 60px;
    height: 100vh;
    background: var(--surface, #1c1e24);
    border-right: 1px solid var(--border, #2e3140);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 0;
    gap: 2px;
    z-index: 200;
    overflow: visible;
  }
  .kinetica-sidebar .logo-wrap {
    width: 36px; height: 36px;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(77,159,255,0.12);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
    flex-shrink: 0;
  }
  .kinetica-sidebar .logo-wrap img {
    width: 28px; height: 28px; object-fit: contain;
  }
  .kinetica-sidebar .nav-item {
    width: 44px; height: 44px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: var(--text-secondary, #9096a8);
    transition: background 0.14s, color 0.14s;
    text-decoration: none;
    position: relative;
  }
  .kinetica-sidebar .nav-item:hover {
    background: var(--surface-high, #2c2f3a);
    color: var(--text-primary, #e8eaf0);
  }
  .kinetica-sidebar .nav-item.active {
    background: rgba(0, 201, 122, 0.12);
    color: var(--calm, #00c97a);
  }
  /* Tooltip on hover */
  .kinetica-sidebar .nav-tooltip {
    position: absolute;
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%);
    background: var(--surface-highest, #363944);
    border: 1px solid var(--border, #2e3140);
    border-radius: 6px;
    padding: 4px 10px;
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-primary, #e8eaf0);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 300;
  }
  .kinetica-sidebar .nav-item:hover .nav-tooltip { opacity: 1; }

  /* Emergency button at bottom */
  .kinetica-sidebar .nav-emergency {
    width: 44px; height: 44px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: var(--crit, #ff4060);
    background: rgba(255, 64, 96, 0.10);
    border: 1px solid rgba(255, 64, 96, 0.30);
    text-decoration: none;
    margin-top: auto;
    margin-bottom: 8px;
    transition: all 0.14s;
    position: relative;
  }
  .kinetica-sidebar .nav-emergency:hover {
    background: rgba(255, 64, 96, 0.20);
  }
  .kinetica-sidebar .nav-divider {
    width: 28px;
    height: 1px;
    background: var(--border, #2e3140);
    margin: 4px 0;
    flex-shrink: 0;
  }
</style>
<nav class="kinetica-sidebar">
  <div class="logo-wrap">
    <img src="${prefix}logo.png" alt="K" onerror="this.style.display='none';this.parentNode.textContent='K';">
  </div>
  ${navItems}
  <div class="nav-divider"></div>
  <a href="${prefix}emergency_override/code.html"
     class="nav-emergency"
     title="Emergency Override">
    <span class="material-symbols-rounded" style="font-size:20px;animation:pulse-icon 1.8s ease infinite;">warning</span>
    <span class="nav-tooltip" style="color: var(--crit,#ff4060);">Emergency Override</span>
  </a>
</nav>
<style>
  @keyframes pulse-icon {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
</style>`;

  // ── Inject sidebar ────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("sidebar-container");
    if (container) {
      container.innerHTML = sidebarHTML;
    }

    // ── Live IST Clock ──────────────────────────────────────────────────
    function updateClock() {
      const el = document.getElementById("live-time");
      if (!el) return;
      const now = new Date();
      const hh = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit",   hour12: false });
      const mm = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", minute: "2-digit", hour12: false });
      const ss = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", second: "2-digit", hour12: false });
      el.textContent = `${hh}:${mm}:${ss} IST`;
    }
    updateClock();
    setInterval(updateClock, 1000);
  });
})();
