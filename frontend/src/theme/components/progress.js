import { mode } from "@chakra-ui/theme-tools";

export const progressStyles = {
  components: {
    Progress: {
      baseStyle: {
        field: {
          borderRadius: "10px",
          bg: "brand.500",
          transition: "all 0.4s ease",
        },
        track: {
          borderRadius: "10px",
          bg: "secondaryGray.100",
        },
      },
      variants: {
        table: (props) => ({
          field: {
            bg: "brand.500",
            borderRadius: "10px",
          },
          track: {
            borderRadius: "10px",
            bg: mode("brand.50", "whiteAlpha.100")(props),
            h: "8px",
            w: "54px",
          },
        }),
        accent: (props) => ({
          field: {
            bg: "accent.500",
            borderRadius: "10px",
          },
          track: {
            borderRadius: "10px",
            bg: mode("accent.50", "whiteAlpha.100")(props),
            h: "8px",
          },
        }),
        teal: (props) => ({
          field: {
            bg: "teal.500",
            borderRadius: "10px",
          },
          track: {
            borderRadius: "10px",
            bg: mode("teal.50", "whiteAlpha.100")(props),
            h: "8px",
          },
        }),
      },
    },
  },
};

export default progressStyles;
