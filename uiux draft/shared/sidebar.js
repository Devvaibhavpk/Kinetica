// sidebar.js - Shared Unified Navigation Component

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("sidebar-container");
    if (!container) return;

    // Determine current active page based on URL
    const currentPath = window.location.href;
    const modules = {
        "command_center_overview": { icon: "dashboard", label: "Network Overview" },
        "intersection_detail_ix_104": { icon: "schema", label: "Intersection IX-104" },
        "green_wave_corridor_view": { icon: "route", label: "Green Wave Corridor" },
        "vision_feed_monitor": { icon: "videocam", label: "Vision Analytics" },
        "analytics_validation": { icon: "analytics", label: "Analytics & Validation" },
        "benchmarks_system_health": { icon: "monitor_heart", label: "System Health" }
    };

    const activeClass = "bg-white/[0.08] text-state-calm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border-white/[0.12]";
    const inactiveClass = "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high";

    let linksHTML = "";
    
    for (const [key, data] of Object.entries(modules)) {
        const isActive = currentPath.includes(key);
        const className = isActive ? activeClass : inactiveClass;
        
        linksHTML += `
            <a href="../${key}/code.html" class="flex items-center gap-4 pl-3 pr-4 py-2.5 rounded-full ${className} transition-all border border-transparent group/link">
                <span class="material-symbols-rounded text-xl shrink-0 flex justify-center w-6 text-center">${isActive ? `<span class="text-state-calm">${data.icon}</span>` : data.icon}</span>
                <span class="font-body text-[13px] ${isActive ? 'font-semibold' : 'font-medium'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">${data.label}</span>
            </a>
        `;
    }

    const sidebarHTML = `
    <!-- Unified Industrial Side Nav Rail -->
    <aside class="fixed left-0 top-0 h-full z-50 flex flex-col bg-[#0a0a0a] border-r border-white/[0.08] w-16 hover:w-64 transition-all duration-300 ease-in-out group shadow-2xl overflow-hidden">
        <!-- Brand Header -->
        <div class="h-14 flex items-center pl-4 border-b border-white/[0.08] shrink-0 overflow-hidden">
            <div class="shrink-0 flex items-center">
                <img src="../../logo.png" alt="Kinetica Logo" class="h-8 w-8 object-contain shrink-0">
            </div>
            <div class="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center overflow-hidden whitespace-nowrap">
                <span class="font-display font-semibold text-on-surface text-[16px] tracking-tight leading-tight">Kinetica</span>
            </div>
        </div>

        <!-- Navigation Links -->
        <div class="flex-1 py-4 flex flex-col gap-2 px-2 overflow-y-auto overflow-x-hidden">
            ${linksHTML}
        </div>

        <!-- Emergency Override -->
        <div class="p-2 border-t border-white/[0.08] flex flex-col gap-2 shrink-0">
            <a href="../emergency_override/code.html" class="w-full flex items-center gap-4 pl-3 pr-4 py-2.5 rounded-full bg-state-preempted-glow border border-state-preempted text-state-preempted hover:bg-state-preempted hover:text-[#0a0a0a] transition-all font-semibold active:scale-95 overflow-hidden">
                <span class="material-symbols-rounded text-xl shrink-0 flex justify-center w-6 text-center animate-pulse">warning</span>
                <span class="font-label text-[10px] tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap font-bold">EMERGENCY OVERRIDE</span>
            </a>
        </div>
    </aside>
    `;

    container.innerHTML = sidebarHTML;
});
