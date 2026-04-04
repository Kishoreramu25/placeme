import { useEffect } from "react";
import { applyGodTheme, applyStandardTheme, GOD_MODE_THEMES } from "@/lib/themes";

export function ThemeInit() {
    useEffect(() => {
        // Check Dark Mode
        const isDark = document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
        if (isDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        // Check God Mode
        const savedGodMode = localStorage.getItem("god-mode") === "true";
        if (savedGodMode) {
            const savedGodTheme = localStorage.getItem("god-theme-id") || GOD_MODE_THEMES[0].id;
            applyGodTheme(savedGodTheme);
        } else {
            const savedTheme = localStorage.getItem("theme-primary");
            if (savedTheme) {
                applyStandardTheme(savedTheme);
            }
        }
    }, []);

    return null;
}
