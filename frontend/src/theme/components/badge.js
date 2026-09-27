import { mode } from "@chakra-ui/theme-tools";

export const badgeStyles = {
  components: {
    Badge: {
      baseStyle: {
        borderRadius: "8px",
        lineHeight: "120%",
        padding: "4px 10px",
        fontWeight: "700",
        fontSize: "xs",
        textTransform: "none",
        letterSpacing: "0.2px",
      },
      variants: {
        outline: (props) => ({
          borderRadius: "8px",
          border: "1px solid",
          borderColor: mode("secondaryGray.300", "whiteAlpha.300")(props),
          color: mode("secondaryGray.800", "white")(props),
        }),
        brand: (props) => ({
          bg: mode("brand.500", "brand.500")(props),
          color: "white",
        }),
        subtleBrand: (props) => ({
          bg: mode("brand.50", "rgba(37, 99, 235, 0.15)")(props),
          color: mode("brand.700", "brand.200")(props),
          border: "1px solid",
          borderColor: mode("brand.200", "rgba(37, 99, 235, 0.3)")(props),
        }),
        accent: (props) => ({
          bg: mode("accent.500", "accent.500")(props),
          color: "white",
        }),
        subtleAccent: (props) => ({
          bg: mode("accent.50", "rgba(245, 158, 11, 0.15)")(props),
          color: mode("accent.800", "accent.200")(props),
          border: "1px solid",
          borderColor: mode("accent.200", "rgba(245, 158, 11, 0.3)")(props),
        }),
        subtleSuccess: (props) => ({
          bg: mode("green.50", "rgba(16, 185, 129, 0.15)")(props),
          color: mode("green.700", "green.200")(props),
          border: "1px solid",
          borderColor: mode("green.200", "rgba(16, 185, 129, 0.3)")(props),
        }),
        subtleDanger: (props) => ({
          bg: mode("red.50", "rgba(244, 63, 94, 0.15)")(props),
          color: mode("red.700", "red.200")(props),
          border: "1px solid",
          borderColor: mode("red.200", "rgba(244, 63, 94, 0.3)")(props),
        }),
      },
    },
  },
};

export default badgeStyles;
