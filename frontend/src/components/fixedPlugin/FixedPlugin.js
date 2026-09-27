// Chakra Imports
import { Button, Icon, useColorMode } from "@chakra-ui/react";
// Custom Icons
import { IoMdMoon, IoMdSunny } from "react-icons/io";
import React from "react";

export default function FixedPlugin(props) {
  const { ...rest } = props;
  const { colorMode, toggleColorMode } = useColorMode();
  const bgButton = "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)";

  return (
    <Button
      {...rest}
      h='54px'
      w='54px'
      zIndex='99'
      bg={bgButton}
      position='fixed'
      variant='no-effects'
      left={document.documentElement.dir === "rtl" ? "30px" : ""}
      right={document.documentElement.dir === "rtl" ? "" : "30px"}
      bottom='24px'
      border='1px solid'
      borderColor='whiteAlpha.300'
      borderRadius='full'
      boxShadow='0 10px 25px -5px rgba(37, 99, 235, 0.45)'
      _hover={{
        transform: 'scale(1.08)',
        boxShadow: '0 14px 28px -4px rgba(37, 99, 235, 0.6)',
      }}
      _active={{ transform: 'scale(0.96)' }}
      transition='all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      onClick={toggleColorMode}
      display='flex'
      p='0px'
      align='center'
      justify='center'
      aria-label='Toggle color mode'
    >
      <Icon
        h='22px'
        w='22px'
        color='white'
        as={colorMode === "light" ? IoMdMoon : IoMdSunny}
      />
    </Button>
  );
}
