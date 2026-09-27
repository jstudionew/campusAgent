import { mode } from "@chakra-ui/theme-tools";

export const switchStyles = {
  components: {
    Switch: {
      baseStyle: {
        thumb: {
          fontWeight: 400,
          borderRadius: "50%",
          w: "16px",
          h: "16px",
          bg: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          _checked: { transform: "translate(20px, 0px)" },
        },
        track: {
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box",
          w: "40px",
          h: "20px",
          p: "2px",
          ps: "2px",
          borderRadius: "20px",
          bg: "secondaryGray.300",
          _checked: {
            bg: "brand.500",
          },
          _focus: {
            boxShadow: "0 0 0 2px rgba(37, 99, 235, 0.4)",
          },
        },
      },
      variants: {
        main: (props) => ({
          track: {
            bg: mode("secondaryGray.300", "navy.700")(props),
            _checked: {
              bg: "brand.500",
            },
          },
        }),
      },
    },
  },
};

export default switchStyles;
