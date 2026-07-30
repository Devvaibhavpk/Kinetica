// theme.js - Shared Tailwind Configuration
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "surface": "#0a0a0a",
                "surface-dim": "#050505",
                "surface-bright": "#171717",
                "surface-container-lowest": "#000000",
                "surface-container-low": "#121212",
                "surface-container": "#1a1a1a",
                "surface-container-high": "#262626",
                "surface-container-highest": "#333333",
                "on-surface": "#e1e7f5",
                "on-surface-variant": "#8e9bb4",
                "outline": "#404e6b",
                "outline-variant": "#232f48",
                
                "primary": "#10b981",
                "on-primary": "#05211c",
                "primary-container": "#183832",
                "on-primary-container": "#a3d9d0",
                
                "secondary": "#f59e0b",
                "on-secondary": "#361c04",
                
                "tertiary": "#e27c7c",
                "on-tertiary": "#3b0c0c",
                
                "error": "#ef4444",
                "on-error": "#3d0600",
                
                "state-calm": "#9ed0ca",
                "state-building": "#ffb783",
                "state-preempted": "#ff5a4e",
                "state-calm-bg": "rgba(158,208,202,0.1)",
                "state-building-bg": "rgba(255,183,131,0.1)",
                "state-preempted-bg": "rgba(255,90,78,0.1)",
                "state-calm-glow": "rgba(121,180,169,0.35)",
                "state-building-glow": "rgba(240,162,93,0.35)",
                "state-preempted-glow": "rgba(240,85,66,0.45)"
            },
            borderRadius: {
                "DEFAULT": "1rem",
                "lg": "1.5rem",
                "xl": "2rem",
                "2xl": "24px",
                "3xl": "32px",
                "full": "9999px"
            },
            boxShadow: {
                "glow-calm": "0 0 16px 2px rgba(121,180,169,0.3)",
                "glow-building": "0 0 16px 2px rgba(240,162,93,0.3)",
                "glow-preempted": "0 0 20px 3px rgba(240,85,66,0.4)",
            },
            fontFamily: {
                "display": ["General Sans", "sans-serif"],
                "body": ["Supreme", "sans-serif"],
                "label": ["Neue Montreal", "sans-serif"],
                "telemetry": ["Commit Mono", "JetBrains Mono", "monospace"],
                "mono": ["Commit Mono", "monospace"]
            }
        }
    }
};
