import { mode } from "@chakra-ui/theme-tools";

export const globalStyles = {
  colors: {
    // Primary Royal Blue Palette (WCAG AA Compliant)
    brand: {
      50: "#EEF4FF",
      100: "#DBEAFE",
      200: "#BFDBFE",
      300: "#93C5FD",
      400: "#60A5FA",
      500: "#2563EB", // Core Royal Blue
      600: "#1D4ED8", // Hover Royal Blue
      700: "#1E40AF", // Active / Pressed
      800: "#1E3A8A", // Deep Royal
      900: "#0F172A", // Midnight Navy
    },
    // Aliases to preserve backward compatibility across all legacy components
    brandScheme: {
      50: "#EEF4FF",
      100: "#DBEAFE",
      200: "#93C5FD",
      300: "#60A5FA",
      400: "#3B82F6",
      500: "#2563EB",
      600: "#1D4ED8",
      700: "#1E40AF",
      800: "#1E3A8A",
      900: "#0F172A",
    },
    brandTabs: {
      50: "#EEF4FF",
      100: "#DBEAFE",
      200: "#93C5FD",
      300: "#60A5FA",
      400: "#3B82F6",
      500: "#2563EB",
      600: "#1D4ED8",
      700: "#1E40AF",
      800: "#1E3A8A",
      900: "#0F172A",
    },
    // Warm Gold / Amber Accent for High-Contrast Professional Hierarchy
    accent: {
      50: "#FFFBEB",
      100: "#FEF3C7",
      200: "#FDE68A",
      300: "#FCD34D",
      400: "#FBBF24",
      500: "#F59E0B", // Vibrant Amber CTA & Badge accent
      600: "#D97706",
      700: "#B45309",
      800: "#92400E",
      900: "#78350F",
    },
    amber: {
      50: "#FFFBEB",
      100: "#FEF3C7",
      200: "#FDE68A",
      300: "#FCD34D",
      400: "#FBBF24",
      500: "#F59E0B",
      600: "#D97706",
      700: "#B45309",
      800: "#92400E",
      900: "#78350F",
    },
    // Teal & Cyan for modern Analytics, Trends & Attendance
    teal: {
      50: "#F0FDFA",
      100: "#CCFBF1",
      200: "#99F6E4",
      300: "#5EEAD4",
      400: "#2DD4BF",
      500: "#0D9488",
      600: "#0F766E",
      700: "#115E59",
      800: "#134E4A",
      900: "#042F2E",
    },
    cyan: {
      50: "#ECFEFF",
      100: "#CFFAFE",
      200: "#A5F3FC",
      300: "#67E8F9",
      400: "#22D3EE",
      500: "#06B6D4",
      600: "#0891B2",
      700: "#0E7490",
      800: "#155E75",
      900: "#164E63",
    },
    // Modern Neutral Slate Grays (fixed 300 to proper slate rather than pure white)
    secondaryGray: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B",
      600: "#475569",
      700: "#334155",
      800: "#1E293B",
      900: "#0F172A",
    },
    // Semantic States: Emerald / Green (Success, Present, Paid)
    green: {
      50: "#ECFDF5",
      100: "#D1FAE5",
      200: "#A7F3D0",
      300: "#6EE7B7",
      400: "#34D399",
      500: "#10B981",
      600: "#059669",
      700: "#047857",
      800: "#065F46",
      900: "#064E3B",
    },
    // Semantic States: Rose / Red (Danger, Absent, Overdue)
    red: {
      50: "#FFF1F2",
      100: "#FFE4E6",
      200: "#FECDD3",
      300: "#FDA4AF",
      400: "#FB7185",
      500: "#F43F5E",
      600: "#E11D48",
      700: "#BE123C",
      800: "#9F1239",
      900: "#881337",
    },
    // Semantic States: Orange / Warning (Pending, Late, Attention)
    orange: {
      50: "#FFF7ED",
      100: "#FFEDD5",
      200: "#FED7AA",
      300: "#FDBA74",
      400: "#FB923C",
      500: "#F97316",
      600: "#EA580C",
      700: "#C2410C",
      800: "#9A3412",
      900: "#7C2D12",
    },
    // Blue / Info
    blue: {
      50: "#EFF6FF",
      100: "#DBEAFE",
      200: "#BFDBFE",
      300: "#93C5FD",
      400: "#60A5FA",
      500: "#2563EB",
      600: "#1D4ED8",
      700: "#1E40AF",
      800: "#1E3A8A",
      900: "#0F172A",
    },
    // Deep Midnight Navy Surfaces for Dark Mode
    navy: {
      50: "#E2E8F0",
      100: "#CBD5E1",
      200: "#94A3B8",
      300: "#64748B",
      400: "#334155",
      500: "#1E293B",
      600: "#162036",
      700: "#111C44", // Secondary dark container
      800: "#0B1329", // Card / Surface dark container
      900: "#070D1E", // Main app background in dark mode
    },
    gray: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B",
      600: "#475569",
      700: "#334155",
      800: "#1E293B",
      900: "#0F172A",
    },
  },
  styles: {
    global: (props) => ({
      body: {
        overflowX: "hidden",
        bg: mode(
          "linear-gradient(135deg, #F0F5FF 0%, #F8FAFC 50%, #EEF4FF 100%)",
          "linear-gradient(135deg, #070D1E 0%, #0B1329 40%, #111C44 100%)"
        )(props),
        color: mode("secondaryGray.900", "white")(props),
        fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        letterSpacing: "-0.2px",
        minHeight: "100vh",
      },
      html: {
        fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      },
      input: {
        color: mode("secondaryGray.900", "white")(props),
      },
      "::placeholder": {
        color: mode("secondaryGray.500", "secondaryGray.400")(props),
      },
      // Smooth modern scrollbars
      "::-webkit-scrollbar": {
        width: "6px",
        height: "6px",
      },
      "::-webkit-scrollbar-track": {
        background: "transparent",
      },
      "::-webkit-scrollbar-thumb": {
        background: mode("rgba(37, 99, 235, 0.2)", "rgba(255, 255, 255, 0.2)")(props),
        borderRadius: "10px",
      },
      "::-webkit-scrollbar-thumb:hover": {
        background: mode("rgba(37, 99, 235, 0.4)", "rgba(255, 255, 255, 0.35)")(props),
      },
    }),
  },
};

export default globalStyles;
