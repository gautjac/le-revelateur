/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Le Révélateur — a darkroom under safelight. Near-black baths, amber
        // safelight glow, the white of fixed photo paper, a wet chemical green.
        bath: {
          DEFAULT: "#0d0c0f", // the developer tray, deepest black
          900: "#121017",
          800: "#171420",
          700: "#1e1a2a",
          600: "#272235",
          500: "#332c44",
        },
        safelight: {
          DEFAULT: "#ff3b30", // the red lamp
          deep: "#c41c14",
          glow: "#ff6a5e",
        },
        amber: {
          DEFAULT: "#f4a522", // dim amber wash
          soft: "#f6c66b",
          dim: "#9c6c1e",
        },
        // fixed paper white / silver gelatin
        paper: {
          DEFAULT: "#f3efe6",
          dim: "#cfc9bb",
          muted: "#8d877a",
        },
        emulsion: "#1b9c7a", // wet chemical green
        cyanide: "#2b6cb0", // cyanotype blue
        // preset-category accent set
        cat: {
          pellicule: "#e0563b", // film stock — warm orange-red
          eclairage: "#f4a522", // lighting — amber
          affiche: "#d23b6e", // poster — magenta
          medium: "#1b9c7a", // medium — chemical green
          docphoto: "#5a86c4", // doc/photo — cool blue
        },
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', '"Arial Narrow"', "sans-serif"],
        sans: ['"Archivo"', "system-ui", "sans-serif"],
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        safelight: "0 0 0 1px rgba(255,59,48,0.4), 0 0 28px -6px rgba(255,59,48,0.5)",
        tray: "inset 0 2px 24px -4px rgba(0,0,0,0.8), 0 18px 40px -20px rgba(0,0,0,0.9)",
        lift: "0 14px 36px -18px rgba(0,0,0,0.85)",
      },
      backgroundImage: {
        "safelight-radial":
          "radial-gradient(80% 120% at 50% -10%, rgba(255,59,48,0.18), transparent 60%)",
        "contact-sheet":
          "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // image "developing" in the bath — emerges from black
        develop: {
          "0%": { filter: "brightness(0.05) contrast(0.6)", opacity: "0.2" },
          "100%": { filter: "brightness(1) contrast(1)", opacity: "1" },
        },
        safebreathe: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        agitate: {
          "0%, 100%": { transform: "rotate(-0.4deg)" },
          "50%": { transform: "rotate(0.4deg)" },
        },
      },
      animation: {
        riseIn: "riseIn 0.42s cubic-bezier(0.16,1,0.3,1) both",
        develop: "develop 2.4s ease-out both",
        safebreathe: "safebreathe 2.2s ease-in-out infinite",
        agitate: "agitate 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
