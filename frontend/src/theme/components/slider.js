import { mode } from "@chakra-ui/theme-tools";

export const sliderStyles = {
  components: {
    RangeSlider: {
      variants: {
        main: (props) => ({
          thumb: {
            bg: mode("brand.500", "brand.500")(props),
            borderColor: "white",
            borderWidth: "2px",
            boxShadow: "0 2px 6px rgba(37, 99, 235, 0.4)",
          },
          filledTrack: {
            bg: mode("brand.500", "brand.500")(props),
          },
          track: {
            bg: mode("secondaryGray.200", "navy.700")(props),
          },
        }),
      },
    },
    Slider: {
      variants: {
        main: (props) => ({
          thumb: {
            bg: mode("brand.500", "brand.500")(props),
            borderColor: "white",
            borderWidth: "2px",
            boxShadow: "0 2px 6px rgba(37, 99, 235, 0.4)",
          },
          filledTrack: {
            bg: mode("brand.500", "brand.500")(props),
          },
          track: {
            bg: mode("secondaryGray.200", "navy.700")(props),
          },
        }),
      },
    },
  },
};

export default sliderStyles;
