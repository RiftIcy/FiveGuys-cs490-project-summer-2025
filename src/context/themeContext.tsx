import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { MantineProvider, createTheme, MantineColorsTuple } from "@mantine/core";

type ThemeType = "system" | "light" | "dark" | "night-sky";

// Custom colors for Night Sky theme
const nightSkyPurple: MantineColorsTuple = [
  '#e8e5ff',  // lightest - for very light backgrounds
  '#d0ccff',  
  '#b8b3ff',  
  '#a09aff',  
  '#8881ff',  
  '#7068ff',  // lighter for less eye strain
  '#5d54e8',  // primary color - darker and softer
  '#4a41d1',  // darker
  '#372eba',  // much darker
  '#241ba3'   // darkest - for emphasis
];

const nightSkyTheme = createTheme({
  colors: {
    nightSky: nightSkyPurple,
  },
  primaryColor: 'nightSky',
  other: {
    // Custom CSS variables that match our night-sky theme
    backgroundColor: 'oklch(0.03 0.02 250)', // Much darker background
    textColor: 'oklch(0.9 0.03 240)',
    cardColor: 'oklch(0.06 0.04 255)', // Darker cards
    borderColor: 'oklch(0.15 0.08 250 / 0.5)', // Darker borders
  },
});

const darkTheme = createTheme({
  primaryColor: 'blue',
});

const lightTheme = createTheme({
  primaryColor: 'blue',
});

interface ThemeContextProps {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<ThemeType>("system");
    const [authChecked, setAuthChecked] = useState(false);

    // Save theme to Firestore when changed by the user
    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        localStorage.setItem("theme", newTheme);

        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
            try {
                const db = getFirestore();
                const userRef = doc(db, "users", user.uid);
                await setDoc(userRef, { theme: newTheme }, { merge: true });
            } catch (err) {
                console.error("Error saving theme to Firestore:", err);
            }
        }
    };

    // Load theme from Firestore for authenticated users
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const db = getFirestore();
                    const userRef = doc(db, "users", user.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        if (data.theme) {
                            setTheme(data.theme);
                            localStorage.setItem("theme", data.theme); // Keep localStorage in sync
                        }
                    } else {
                        // First-time user: create document with default theme
                        await setDoc(userRef, { theme: "system" });
                        setTheme("system");
                        localStorage.setItem("theme", "system");
                    }
                } catch (err) {
                    console.error("Error loading theme from Firestore:", err);
                }
            } else {
                // Not signed in, fall back to localStorage or system
                const savedTheme = (localStorage.getItem("theme") as ThemeType) || "system";
                setTheme(savedTheme);
            }
            setAuthChecked(true); // <-- Set to true after auth check
        });
        return () => unsubscribe();
    }, []);

    // Compute resolved scheme for Mantine
    const resolvedScheme: "light" | "dark" =
        theme === "system"
            ? (typeof window !== 'undefined' && window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light")
            : theme === "night-sky"
            ? "dark"
            : theme;

    // Get the appropriate Mantine theme
    const getMantineTheme = () => {
        if (theme === "night-sky") {
            return nightSkyTheme;
        } else if (resolvedScheme === "dark") {
            return darkTheme;
        } else {
            return lightTheme;
        }
    };

    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = (selectedTheme: ThemeType) => {
            // Remove all theme classes first
            root.classList.remove("dark", "night-sky");
            
            if (selectedTheme === "light") {
                // Light theme - no additional classes needed
            } else if (selectedTheme === "dark") {
                root.classList.add("dark");
            } else if (selectedTheme === "night-sky") {
                root.classList.add("dark", "night-sky");
            } else if (selectedTheme === "system") {
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                if (prefersDark) {
                    root.classList.add("dark");
                }
            }
        };

        applyTheme(theme);
        localStorage.setItem("theme", theme);

        // Add a listener for system theme changes if "system" is selected
        let mediaQuery: MediaQueryList | null = null;
        const handleSystemThemeChange = (e: MediaQueryListEvent) => {
            if (theme === "system") {
                applyTheme(e.matches ? "dark" : "light");
            }
        };

        if (theme === "system") {
            mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            mediaQuery.addEventListener("change", handleSystemThemeChange);
        }

        // Cleanup the listener on unmount or when the theme changes
        return () => {
            if (mediaQuery) {
                mediaQuery.removeEventListener("change", handleSystemThemeChange);
            }
        };
    }, [theme]);

    if (!authChecked) {
        return <div>Loading...</div>; // Or your preferred loading UI
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <MantineProvider 
                theme={getMantineTheme()} 
                defaultColorScheme={resolvedScheme} 
                forceColorScheme={resolvedScheme}
            >
                {children}
            </MantineProvider>
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextProps => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};