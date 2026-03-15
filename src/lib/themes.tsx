import { Crown, Sparkles, User } from "lucide-react";

export const STANDARD_THEMES = [
    { name: "Professional Blue", value: "222 47% 31%", ring: "217 91% 60%" },
    { name: "Crimson Red", value: "0 72% 51%", ring: "0 72% 51%" },
    { name: "Emerald Green", value: "142 76% 36%", ring: "142 76% 36%" },
    { name: "Royal Purple", value: "262 83% 58%", ring: "262 83% 58%" },
    { name: "Sunset Orange", value: "24 95% 53%", ring: "24 95% 53%" },
    { name: "Ocean Teal", value: "173 58% 39%", ring: "173 58% 39%" },
    { name: "Midnight Indigo", value: "243 75% 59%", ring: "243 75% 59%" },
    { name: "Hot Pink", value: "330 81% 60%", ring: "330 81% 60%" },
    { name: "Vibrant Cyan", value: "189 94% 43%", ring: "189 94% 43%" },
    { name: "Golden Yellow", value: "47 95% 50%", ring: "47 95% 50%" },
];

export const GOD_MODE_THEMES = [
    {
        id: "modern_luxury",
        name: "Modern Luxury SaaS",
        description: "Clean. Expensive. Global. (Founder / Investor Safe)",
        colors: {
            background: "210 61% 11%",       // Midnight Navy #0B1C2D
            foreground: "60 17% 97%",        // Ivory White #FAF9F6
            primary: "46 65% 52%",           // Soft Gold #D4AF37
            card: "210 61% 13%",             // Slightly lighter navy
            muted: "216 12% 65%",            // Muted Grey #9CA3AF
            border: "216 12% 25%",
        },
        fonts: {
            heading: "'Playfair Display', serif",
            body: "'Inter', sans-serif"
        },
        icon: Sparkles
    },
    {
        id: "black_card",
        name: "Black Card Luxury",
        description: "Feels like Amex Black, Rolex, Bentley. (Ultra-Premium)",
        colors: {
            background: "0 0% 4%",           // Jet Black #0B0B0B
            foreground: "0 0% 93%",          // Soft White #EDEDED
            primary: "42 47% 57%",           // Champagne Gold #C6A75E
            card: "0 0% 7%",                 // Slightly lighter black
            muted: "0 0% 16%",               // Warm Grey #2A2A2A
            border: "0 0% 20%",
        },
        fonts: {
            heading: "'Cormorant Garamond', serif",
            body: "'Inter', sans-serif"
        },
        icon: Crown
    },
    {
        id: "corporate_elite",
        name: "Corporate Elite",
        description: "No drama. Pure trust. (Safe, Professional)",
        colors: {
            background: "0 0% 100%",         // White #FFFFFF
            foreground: "218 19% 27%",       // Steel Grey #374151
            primary: "210 64% 16%",          // Royal Blue #0F2A44
            card: "0 0% 98%",
            muted: "220 13% 91%",            // Platinum Grey #E5E7EB
            border: "220 13% 85%",
        },
        fonts: {
            heading: "'Poppins', sans-serif",
            body: "'Roboto', sans-serif"
        },
        icon: User
    },
    {
        id: "new_age",
        name: "New-Age Premium",
        description: "Fresh, bold, still expensive. (Gen-Z but Rich)",
        colors: {
            background: "0 0% 7%",           // Carbon Black #111111
            foreground: "0 0% 96%",          // Off White #F4F4F4
            primary: "44 90% 61%",           // Electric Gold #F5C542
            card: "0 0% 10%",
            muted: "0 0% 23%",               // Ash Grey #3A3A3A
            border: "0 0% 23%",
        },
        fonts: {
            heading: "'Sora', sans-serif",
            body: "'Inter', sans-serif"
        },
        icon: Sparkles
    }
];

export const applyGodTheme = (themeId: string) => {
    const theme = GOD_MODE_THEMES.find(t => t.id === themeId);
    if (!theme) return;

    // Apply Fonts
    document.documentElement.style.setProperty("--font-sans", theme.fonts.body);
    document.documentElement.style.setProperty("--font-heading", theme.fonts.heading);

    // Apply Colors
    document.documentElement.style.setProperty("--background", theme.colors.background);
    document.documentElement.style.setProperty("--foreground", theme.colors.foreground);
    document.documentElement.style.setProperty("--primary", theme.colors.primary);
    document.documentElement.style.setProperty("--card", theme.colors.card);
    document.documentElement.style.setProperty("--popover", theme.colors.card);
    document.documentElement.style.setProperty("--muted", theme.colors.muted);
    document.documentElement.style.setProperty("--border", theme.colors.border);
    document.documentElement.style.setProperty("--input", theme.colors.border);

    // Derived or same
    document.documentElement.style.setProperty("--ring", theme.colors.primary);
    document.documentElement.style.setProperty("--card-foreground", theme.colors.foreground);
    document.documentElement.style.setProperty("--popover-foreground", theme.colors.foreground);

    // Sidebar
    document.documentElement.style.setProperty("--sidebar-background", theme.colors.background);
    document.documentElement.style.setProperty("--sidebar-foreground", theme.colors.foreground);
    document.documentElement.style.setProperty("--sidebar-primary", theme.colors.primary);
    document.documentElement.style.setProperty("--sidebar-border", theme.colors.border);
};

export const applyStandardTheme = (colorValue: string) => {
    const theme = STANDARD_THEMES.find(t => t.value === colorValue) || STANDARD_THEMES[0];
    document.documentElement.style.setProperty("--primary", theme.value);
    document.documentElement.style.setProperty("--ring", theme.ring);
    document.documentElement.style.setProperty("--sidebar-primary", theme.ring);
};
