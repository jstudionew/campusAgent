import React from "react";
import { Box, useColorModeValue } from "@chakra-ui/react";

function Card(props) {
  const { variant, children, className, ...rest } = props;

  const bg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("rgba(219, 234, 254, 0.8)", "whiteAlpha.100");
  const boxShadow = useColorModeValue(
    "0 4px 20px rgba(37, 99, 235, 0.05)",
    "0 8px 24px rgba(0, 0, 0, 0.45)"
  );
  const hoverShadow = useColorModeValue(
    "0 8px 25px rgba(37, 99, 235, 0.1)",
    "0 12px 30px rgba(0, 0, 0, 0.6)"
  );

  return (
    <Box
      bg={bg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="16px"
      className={`${className ? className + " " : ""}responsive-card`}
      boxShadow={boxShadow}
      transition="all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={{
        transform: "translateY(-2px)",
        boxShadow: hoverShadow,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

export default Card;
