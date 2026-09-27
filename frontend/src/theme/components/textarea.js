import { mode } from "@chakra-ui/theme-tools";

export const textareaStyles = {
  components: {
    Textarea: {
      baseStyle: {
        field: {
          fontWeight: 400,
          borderRadius: "10px",
        },
      },
      variants: {
        main: (props) => ({
          field: {
            bg: mode("white", "navy.800")(props),
            border: "1px solid",
            color: mode("secondaryGray.900", "white")(props),
            borderColor: mode("secondaryGray.200", "whiteAlpha.200")(props),
            borderRadius: "10px",
            fontSize: "sm",
            p: "14px",
            _hover: {
              borderColor: mode("brand.300", "brand.400")(props),
            },
            _focus: {
              borderColor: "brand.500",
              boxShadow: "0 0 0 1px #2563EB",
            },
            _placeholder: { color: mode("secondaryGray.400", "secondaryGray.400")(props) },
          },
        }),
        auth: (props) => ({
          field: {
            bg: mode("white", "navy.800")(props),
            border: "1px solid",
            borderColor: mode("secondaryGray.200", "whiteAlpha.200")(props),
            borderRadius: "12px",
            color: mode("secondaryGray.900", "white")(props),
            _focus: {
              borderColor: "brand.500",
              boxShadow: "0 0 0 1px #2563EB",
            },
            _placeholder: { color: mode("secondaryGray.400", "secondaryGray.400")(props) },
          },
        }),
        authSecondary: (props) => ({
          field: {
            bg: mode("white", "navy.800")(props),
            border: "1px solid",
            borderColor: mode("secondaryGray.200", "whiteAlpha.200")(props),
            borderRadius: "12px",
            color: mode("secondaryGray.900", "white")(props),
            _placeholder: { color: mode("secondaryGray.400", "secondaryGray.400")(props) },
          },
        }),
        search: (props) => ({
          field: {
            border: "none",
            py: "11px",
            borderRadius: "inherit",
            color: mode("secondaryGray.900", "white")(props),
            _placeholder: { color: mode("secondaryGray.400", "secondaryGray.400")(props) },
          },
        }),
      },
    },
  },
};

export default textareaStyles;
