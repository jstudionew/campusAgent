import { mode } from "@chakra-ui/theme-tools";

export const inputStyles = {
  components: {
    Input: {
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
            fontWeight: "500",
            color: mode("secondaryGray.900", "white")(props),
            bg: mode("white", "navy.800")(props),
            border: "1px solid",
            borderColor: mode("secondaryGray.200", "whiteAlpha.200")(props),
            borderRadius: "12px",
            _hover: {
              borderColor: mode("brand.300", "brand.400")(props),
            },
            _focus: {
              borderColor: "brand.500",
              boxShadow: "0 0 0 1px #2563EB",
            },
            _placeholder: { color: mode("secondaryGray.400", "secondaryGray.400")(props), fontWeight: "400" },
          },
        }),
        authSecondary: (props) => ({
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
    NumberInput: {
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
            borderColor: mode("secondaryGray.200", "whiteAlpha.200")(props),
            borderRadius: "10px",
            color: mode("secondaryGray.900", "white")(props),
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
    Select: {
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
            _hover: {
              borderColor: mode("brand.300", "brand.400")(props),
            },
            _focus: {
              borderColor: "brand.500",
              boxShadow: "0 0 0 1px #2563EB",
            },
            _placeholder: { color: mode("secondaryGray.400", "secondaryGray.400")(props) },
          },
          icon: {
            color: mode("secondaryGray.600", "secondaryGray.400")(props),
          },
        }),
        mini: (props) => ({
          field: {
            bg: mode("transparent", "navy.800")(props),
            border: "0px solid transparent",
            p: "10px",
            color: mode("secondaryGray.900", "white")(props),
          },
          icon: {
            color: mode("secondaryGray.600", "secondaryGray.400")(props),
          },
        }),
        subtle: (props) => ({
          box: {
            width: "unset",
          },
          field: {
            bg: "transparent",
            border: "0px solid",
            color: mode("secondaryGray.700", "white")(props),
            borderColor: "transparent",
            width: "max-content",
          },
          icon: {
            color: mode("secondaryGray.600", "secondaryGray.400")(props),
          },
        }),
        transparent: (props) => ({
          field: {
            bg: "transparent",
            border: "0px solid",
            width: "min-content",
            color: mode("secondaryGray.700", "white")(props),
            borderColor: "transparent",
            padding: "0px",
            paddingLeft: "8px",
            paddingRight: "20px",
            fontWeight: "600",
            fontSize: "14px",
          },
          icon: {
            transform: "none !important",
            position: "unset !important",
            width: "unset",
            color: mode("secondaryGray.600", "secondaryGray.400")(props),
            right: "0px",
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
          },
        }),
        authSecondary: (props) => ({
          field: {
            bg: mode("white", "navy.800")(props),
            border: "1px solid",
            borderColor: mode("secondaryGray.200", "whiteAlpha.200")(props),
            borderRadius: "12px",
            color: mode("secondaryGray.900", "white")(props),
          },
        }),
        search: (props) => ({
          field: {
            border: "none",
            py: "11px",
            borderRadius: "inherit",
            color: mode("secondaryGray.900", "white")(props),
          },
        }),
      },
    },
  },
};

export default inputStyles;
