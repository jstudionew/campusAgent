import { mode } from "@chakra-ui/theme-tools";

export const buttonStyles = {
  components: {
    Button: {
      baseStyle: {
        borderRadius: "12px",
        fontWeight: "600",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        boxSizing: "border-box",
        _focus: {
          boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.35)",
        },
        _active: {
          transform: "scale(0.98)",
        },
      },
      variants: {
        outline: (props) => ({
          borderRadius: "12px",
          border: "1px solid",
          borderColor: mode("secondaryGray.300", "whiteAlpha.300")(props),
          color: mode("secondaryGray.900", "white")(props),
          bg: "transparent",
          _hover: {
            bg: mode("secondaryGray.100", "whiteAlpha.100")(props),
            borderColor: mode("brand.500", "brand.400")(props),
          },
        }),
        brand: (props) => ({
          bg: mode("brand.500", "brand.500")(props),
          color: "white",
          boxShadow: "0 4px 14px 0 rgba(37, 99, 235, 0.35)",
          _hover: {
            bg: mode("brand.600", "brand.600")(props),
            boxShadow: "0 6px 20px 0 rgba(37, 99, 235, 0.45)",
            _disabled: {
              bg: "brand.500",
            },
          },
          _active: {
            bg: mode("brand.700", "brand.700")(props),
          },
        }),
        darkBrand: (props) => ({
          bg: mode("navy.800", "brand.500")(props),
          color: "white",
          _hover: {
            bg: mode("navy.700", "brand.600")(props),
          },
          _active: {
            bg: mode("navy.900", "brand.700")(props),
          },
        }),
        lightBrand: (props) => ({
          bg: mode("brand.50", "whiteAlpha.100")(props),
          color: mode("brand.600", "brand.200")(props),
          _hover: {
            bg: mode("brand.100", "whiteAlpha.200")(props),
          },
          _active: {
            bg: mode("brand.200", "whiteAlpha.300")(props),
          },
        }),
        accent: (props) => ({
          bg: mode("accent.500", "accent.500")(props),
          color: "white",
          boxShadow: "0 4px 14px 0 rgba(245, 158, 11, 0.35)",
          _hover: {
            bg: mode("accent.600", "accent.600")(props),
            boxShadow: "0 6px 20px 0 rgba(245, 158, 11, 0.45)",
          },
          _active: {
            bg: mode("accent.700", "accent.700")(props),
          },
        }),
        lightAccent: (props) => ({
          bg: mode("accent.50", "whiteAlpha.100")(props),
          color: mode("accent.700", "accent.300")(props),
          _hover: {
            bg: mode("accent.100", "whiteAlpha.200")(props),
          },
        }),
        teal: (props) => ({
          bg: mode("teal.500", "teal.500")(props),
          color: "white",
          boxShadow: "0 4px 14px 0 rgba(13, 148, 136, 0.35)",
          _hover: {
            bg: mode("teal.600", "teal.600")(props),
          },
        }),
        light: (props) => ({
          bg: mode("secondaryGray.100", "whiteAlpha.100")(props),
          color: mode("secondaryGray.900", "white")(props),
          _hover: {
            bg: mode("secondaryGray.200", "whiteAlpha.200")(props),
          },
          _active: {
            bg: mode("secondaryGray.300", "whiteAlpha.300")(props),
          },
        }),
        action: (props) => ({
          fontWeight: "600",
          borderRadius: "50px",
          bg: mode("brand.50", "whiteAlpha.200")(props),
          color: mode("brand.600", "brand.300")(props),
          _hover: {
            bg: mode("brand.100", "whiteAlpha.300")(props),
          },
          _active: {
            bg: mode("brand.200", "whiteAlpha.400")(props),
          },
        }),
        setup: (props) => ({
          fontWeight: "600",
          borderRadius: "50px",
          bg: "transparent",
          border: "1px solid",
          borderColor: mode("secondaryGray.300", "whiteAlpha.300")(props),
          color: mode("secondaryGray.900", "white")(props),
          _hover: {
            bg: mode("secondaryGray.100", "whiteAlpha.100")(props),
            borderColor: mode("brand.500", "brand.400")(props),
          },
        }),
      },
    },
  },
};

export default buttonStyles;
