import React, { useContext } from "react";

// Chakra imports
import { Flex, useColorModeValue, Image, IconButton, Tooltip, Box } from "@chakra-ui/react";

// Custom components
import { HSeparator } from "components/separator/Separator";

// Assets
import { SidebarContext } from "contexts/SidebarContext";
import { MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight } from "react-icons/md";

export function SidebarBrand() {
  const { toggleSidebar, setToggleSidebar } = useContext(SidebarContext) || {};
  const isCollapsed = !!toggleSidebar;
  const logoSrc = `/CAlogo.jfif`;
  const iconColor = useColorModeValue("secondaryGray.600", "secondaryGray.300");
  const tooltipLabel = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
  const ToggleIcon = isCollapsed ? MdKeyboardDoubleArrowRight : MdKeyboardDoubleArrowLeft;

  const handleToggle = () => {
    if (typeof setToggleSidebar === "function") {
      setToggleSidebar((prev) => !prev);
    }
  };

  return (
    <Flex align='center' direction='column'>
      <Flex
        align='center'
        justify={isCollapsed ? 'center' : 'flex-start'}
        w='100%'
        px='8px'
        pe={isCollapsed ? '52px' : '44px'}
        position='relative'
      >
        {isCollapsed ? (
          <Box
            h={{ base: '44px', md: '48px' }}
            w={{ base: '44px', md: '48px' }}
            my='20px'
            overflow='hidden'
            borderRadius='12px'
            display='flex'
            alignItems='center'
            justifyContent='center'
          >
            <Image
              src={logoSrc}
              h='100%'
              w={{ base: '170px', md: '200px' }}
              objectFit='cover'
              objectPosition='left center'
              alt="CampusAgent"
              transition='all 0.2s ease'
              draggable={false}
            />
          </Box>
        ) : (
          <Box
            w='64px'
            h='64px'
            my='16px'
            overflow='hidden'
            display='flex'
            alignItems='center'
            justifyContent='center'
          >
            <Image
              src={logoSrc}
              h='100%'
              w='100%'
              objectFit='contain'
              alt="CampusAgent"
              transition='all 0.2s ease'
              draggable={false}
            />
          </Box>
        )}
        {typeof setToggleSidebar === "function" && (
          <Tooltip label={tooltipLabel} placement='right' hasArrow>
            <IconButton
              aria-label={tooltipLabel}
              size={isCollapsed ? 'sm' : 'sm'}
              variant='ghost'
              borderRadius='full'
              icon={<ToggleIcon size={18} />}
              color={iconColor}
              bg={useColorModeValue('white', 'navy.800')}
              borderWidth='1px'
              borderColor={useColorModeValue('secondaryGray.200', 'whiteAlpha.200')}
              transition='all 0.2s ease'
              _hover={{
                bg: useColorModeValue('brand.50', 'whiteAlpha.200'),
                color: 'brand.500',
                borderColor: 'brand.300',
                transform: 'translateY(-50%) scale(1.08)',
                boxShadow: 'sm'
              }}
              _active={{ transform: 'translateY(-50%) scale(0.96)' }}
              position='absolute'
              right={isCollapsed ? '6px' : '4px'}
              top='50%'
              transform='translateY(-50%)'
              onClick={handleToggle}
            />
          </Tooltip>
        )}
      </Flex>
      <HSeparator mb='16px' />
    </Flex>
  );
}

export default SidebarBrand;
