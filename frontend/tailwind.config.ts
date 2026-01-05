import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // === Accent Color ===
        primary: {
          DEFAULT: "#00BCD4", // Cyan (Main Accent)
          dark: "#0097a7",    // Darker Cyan
          hover: "#22D3EE",   // Lighter Cyan for hover
          light: "#B2EBF2",   // Very Light Cyan
        },
        
        // === Backgrounds ===
        background: {
          light: "#F5F8F8",
          dark: "#0A0E13",    // Main Background (Deep, profound dark)
          alt: "#1A1F2E",     // Alternative Background (Warmer dark)
        },
        
        // === Card/Panel Backgrounds ===
        surface: {
          DEFAULT: "#1F2833", // Card/Panel Background (Slightly darker for panels/settings)
          dark: "#151A21",    // Darker Surface
          soft: "#252D3D",    // General Cards (like 'Quản lý các luồng')
          highlight: "#224449", // Teal tint for special elements
        },
        
        // === Input Fields ===
        input: {
          dark: "#1F2833",    // Input Background
        },
        
        // === Borders ===
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.1)", // Subtle/Inactive border (White 10%)
          highlight: "#00BCD4",                 // Focus/Active border (Cyan)
          inactive: "#6B7280",                  // Inactive input border (Dark Gray)
          soft: "#2A3B47",                      // Fallback border color
        },
        
        // === Text Colors ===
        text: {
          primary: "#FFFFFF",   // White
          secondary: "#B0B8C4", // Light Gray (Secondary/Subtle)
          muted: "#6B7280",     // Dark Gray (Faded/Placeholder)
        },
        
        // === Overlay ===
        overlay: {
          modal: "rgba(0, 0, 0, 0.6)", // Modal/Dialog overlay (Black 60%)
        },
        
        // === Promotional/Badge Colors ===
        badge: {
          magenta: "#E040FB", // Subtle magenta for badges
        },
      },
      
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      
      borderRadius: {
        lg: "1rem",      // 16px (Softer UI)
        xl: "1.5rem",    // 24px
        "2xl": "2rem",   // 32px
      },
      
      boxShadow: {
        "glow": "0 0 15px rgba(0, 188, 212, 0.3)",           // Cyan glow
        "glow-intense": "0 0 25px rgba(0, 188, 212, 0.5)",   // Intense cyan glow for hover
        "card": "0 4px 20px rgba(0, 0, 0, 0.25)",            // Subtle card shadow
        "card-hover": "0 10px 40px rgba(0, 0, 0, 0.4)",      // Intensified shadow for hover
      },
      
      backgroundImage: {
        "gradient-primary": "linear-gradient(to right, #00BCD4, #22D3EE)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "float-slow": "float-slow 5s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
};
export default config;
