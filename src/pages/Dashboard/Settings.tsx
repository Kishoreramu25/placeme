import { useState, useEffect } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Check, Phone, Mail, User, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    STANDARD_THEMES,
    GOD_MODE_THEMES,
    applyGodTheme,
    applyStandardTheme
} from "@/lib/themes";

export default function Settings() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [currentTheme, setCurrentTheme] = useState(STANDARD_THEMES[0].value);
    const [isGodMode, setIsGodMode] = useState(false);
    const [activeGodTheme, setActiveGodTheme] = useState(GOD_MODE_THEMES[0].id);

    // Initialize state
    useEffect(() => {
        const isDark = document.documentElement.classList.contains("dark");
        setIsDarkMode(isDark);

        const savedGodMode = localStorage.getItem("god-mode") === "true";
        setIsGodMode(savedGodMode);

        if (savedGodMode) {
            const savedGodTheme = localStorage.getItem("god-theme-id") || GOD_MODE_THEMES[0].id;
            setActiveGodTheme(savedGodTheme);
            applyGodTheme(savedGodTheme);
        } else {
            const savedTheme = localStorage.getItem("theme-primary");
            if (savedTheme) {
                setCurrentTheme(savedTheme);
                applyStandardTheme(savedTheme);
            }
        }
    }, []);

    const toggleDarkMode = (checked: boolean) => {
        setIsDarkMode(checked);
        if (checked) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    const toggleGodMode = (checked: boolean) => {
        setIsGodMode(checked);
        localStorage.setItem("god-mode", String(checked));

        if (checked) {
            // Apply current god theme
            applyGodTheme(activeGodTheme);
        } else {
            // Revert to standard theme: reset variables
            const varsToRemove = [
                "--background", "--foreground", "--primary", "--card",
                "--muted", "--border", "--font-sans", "--font-heading",
                "--ring", "--sidebar-primary", "--popover", "--card-foreground", "--muted-foreground",
                "--input", "--sidebar-background", "--sidebar-foreground", "--sidebar-border"
            ];
            varsToRemove.forEach(v => document.documentElement.style.removeProperty(v));

            // Re-apply primary
            applyStandardTheme(currentTheme);
        }
    };

    const handleStandardThemeChange = (colorValue: string) => {
        applyStandardTheme(colorValue);
        setCurrentTheme(colorValue);
        localStorage.setItem("theme-primary", colorValue);
    };

    const handleGodThemeChange = (themeId: string) => {
        applyGodTheme(themeId);
        setActiveGodTheme(themeId);
        localStorage.setItem("god-theme-id", themeId);
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">Customize your interface and view contact information.</p>
                </div>

                {/* Appearance Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>Customize how the application looks on your device.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* God Mode Toggle */}
                        <div className="flex items-center justify-between rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Label className="text-base font-bold text-primary">GOD MODE</Label>
                                    <Crown className="h-4 w-4 text-primary fill-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Unlock ultra-premium, high-end design systems.
                                </p>
                            </div>
                            <Switch checked={isGodMode} onCheckedChange={toggleGodMode} />
                        </div>

                        {!isGodMode ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <Label className="text-base">Dark Mode</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Switch between light and dark themes.
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Sun className="h-4 w-4 text-muted-foreground" />
                                        <Switch
                                            checked={isDarkMode}
                                            onCheckedChange={toggleDarkMode}
                                        />
                                        <Moon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label className="text-base">Theme Color</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Select a primary color for the dashboard.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {STANDARD_THEMES.map((theme) => (
                                            <button
                                                key={theme.value}
                                                onClick={() => applyStandardTheme(theme.value)}
                                                className={cn(
                                                    "group relative flex items-center gap-2 rounded-lg border p-2 transition-all hover:bg-muted font-medium text-sm",
                                                    currentTheme === theme.value && "border-primary ring-1 ring-primary"
                                                )}
                                            >
                                                <span
                                                    className="h-6 w-6 rounded-full border shadow-sm"
                                                    style={{ backgroundColor: `hsl(${theme.value})` }}
                                                />
                                                <span className="truncate">{theme.name}</span>
                                                {currentTheme === theme.value && (
                                                    <div className="absolute right-2 top-2.5">
                                                        <Check className="h-4 w-4 text-primary" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid gap-4 md:grid-cols-2">
                                    {GOD_MODE_THEMES.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => applyGodTheme(theme.id)}
                                            className={cn(
                                                "relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg",
                                                activeGodTheme === theme.id
                                                    ? "border-primary bg-primary/5 shadow-md"
                                                    : "border-muted bg-card hover:border-primary/50"
                                            )}
                                        >
                                            <div className="flex w-full items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("p-2 rounded-lg", activeGodTheme === theme.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                                        <theme.icon className="h-5 w-5" />
                                                    </div>
                                                    <span className="font-bold text-lg" style={{ fontFamily: theme.fonts.heading }}>{theme.name}</span>
                                                </div>
                                                {activeGodTheme === theme.id && <Check className="h-5 w-5 text-primary" />}
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">{theme.description}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="h-6 w-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: `hsl(${theme.colors.background})` }} title="Background" />
                                                <div className="h-6 w-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: `hsl(${theme.colors.primary})` }} title="Primary" />
                                                <div className="h-6 w-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: `hsl(${theme.colors.foreground})` }} title="Text" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="rounded-lg bg-muted/50 p-4 border border-dashed border-primary/20">
                                    <p className="text-xs text-center text-muted-foreground">
                                        God Mode overrides all standard appearance settings.
                                        Fonts and color palettes are expertly curated for maximum impact.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Developer Contact Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Developer</CardTitle>
                        <CardDescription>Get in touch with the team for support or inquiries.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">

                        {/* Kishore's Contact */}
                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Kishore</h3>
                                    <p className="text-xs text-muted-foreground">Developer</p>
                                    <p className="text-[10px] font-medium text-primary/80 uppercase tracking-wider mt-0.5">Department: AI - DS</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>+91 9600587828</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a href="mailto:ramkisho28@gmail.com" className="hover:underline">ramkisho28@gmail.com</a>
                                </div>
                            </div>
                        </div>

                        {/* Kumar's Contact */}
                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Kumar</h3>
                                    <p className="text-xs text-muted-foreground">Developer</p>
                                    <p className="text-[10px] font-medium text-primary/80 uppercase tracking-wider mt-0.5">Department: AI - DS</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>+91 9003672214</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a href="mailto:kumaraids@gmail.com" className="hover:underline">kumaraids@gmail.com</a>
                                </div>
                            </div>
                        </div>

                        {/* General Support */}
                        <div className="rounded-lg border p-4 space-y-3 md:col-span-2 bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <Phone className="h-5 w-5 text-green-700" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Support Helpline - ZENETIVE INFOTECH</h3>
                                    <p className="text-xs text-muted-foreground">24/7 Technical Support</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-lg tracking-wider">+91 90424 27828</span>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
    );
}
