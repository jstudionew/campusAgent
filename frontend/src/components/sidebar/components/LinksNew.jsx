/* eslint-disable */
import React, { useState, useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
// chakra imports
import {
  Box,
  Flex,
  HStack,
  Text,
  useColorModeValue,
  Icon,
  Collapse,
  VStack,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  Portal
} from "@chakra-ui/react";
import { SidebarContext } from "contexts/SidebarContext";
import { MdKeyboardArrowDown, MdKeyboardArrowRight } from "react-icons/md";

export function SidebarLinks(props) {
  const [openMenus, setOpenMenus] = useState({});
  const [collapsedOpen, setCollapsedOpen] = useState({});

  // Chakra color mode - modern hierarchy
  let location = useLocation();
  let activeColor = useColorModeValue("brand.700", "white");
  let inactiveColor = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  let activeIcon = useColorModeValue("brand.500", "brand.300");
  let inactiveIcon = useColorModeValue("secondaryGray.500", "secondaryGray.400");
  let textColor = useColorModeValue("secondaryGray.700", "secondaryGray.300");
  let brandColor = useColorModeValue("brand.500", "brand.400");
  let activeBg = useColorModeValue("brand.50", "rgba(37, 99, 235, 0.2)");
  let hoverBg = useColorModeValue("secondaryGray.100", "whiteAlpha.100");
  let popoverBg = useColorModeValue("white", "navy.800");
  let popoverBorder = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  let categoryTextColor = useColorModeValue("secondaryGray.500", "secondaryGray.400");

  const { routes } = props;
  const { toggleSidebar } = useContext(SidebarContext) || {};
  const isCollapsed = !!toggleSidebar;

  const normalizePath = (p) => {
    if (!p) return '';
    return String(p).toLowerCase();
  };

  const getFullPath = (r) => {
    if (!r) return '';
    return normalizePath(`${r.layout || ''}${r.path || ''}`);
  };

  const isRouteActive = (fullPath) => {
    const current = normalizePath(location.pathname);
    const target = normalizePath(fullPath);
    if (!target) return false;
    if (current === target) return true;
    return current.startsWith(target + '/');
  };

  const hasActiveChild = (items) => {
    if (!items) return false;
    return items.some(item =>
      item.path && isRouteActive(getFullPath(item))
    );
  };

  const toggleMenu = (menuName) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  // Render sub-menu items recursively
  const renderSubItems = (items, level = 0) => {
    return items.map((item, index) => {
      if (item.hidden) return null;

      const paddingStart = `${48 + level * 16}px`;

      if (item.collapse && item.items) {
        const isOpen = openMenus[item.name] || hasActiveChild(item.items);
        const hasActive = hasActiveChild(item.items);

        return (
          <Box key={index} mb="2px">
            <Box
              onClick={() => toggleMenu(item.name)}
              cursor="pointer"
              _hover={{
                bg: hoverBg,
                borderRadius: "8px"
              }}
              py="6px"
              ps={paddingStart}
              pe="10px"
              display={isCollapsed ? "none" : "block"}
              transition="all 0.15s ease"
            >
              <HStack spacing="auto" alignItems="center">
                <Text
                  fontSize="sm"
                  color={hasActive ? activeColor : textColor}
                  fontWeight={hasActive ? "700" : "500"}
                >
                  {item.name}
                </Text>
                <Icon
                  as={isOpen ? MdKeyboardArrowDown : MdKeyboardArrowRight}
                  color={hasActive ? brandColor : textColor}
                  w="16px"
                  h="16px"
                />
              </HStack>
            </Box>
            <Collapse in={isOpen} animateOpacity>
              <VStack align="stretch" spacing="2px">
                {renderSubItems(item.items, level + 1)}
              </VStack>
            </Collapse>
          </Box>
        );
      }

      if (!item.path) return null;

      const active = isRouteActive(getFullPath(item));

      return (
        <NavLink key={index} to={item.layout + item.path}>
          <HStack
            spacing="16px"
            py="7px"
            ps={paddingStart}
            pe="10px"
            my="1px"
            mx="6px"
            borderRadius="8px"
            position="relative"
            bg={active ? activeBg : "transparent"}
            _hover={{
              bg: active ? activeBg : hoverBg,
            }}
            transition="all 0.15s ease"
            display={isCollapsed ? "none" : "flex"}
          >
            <Text
              fontSize="sm"
              color={active ? activeColor : textColor}
              fontWeight={active ? "700" : "500"}
            >
              {item.name}
            </Text>
            {active && (
              <Box
                position="absolute"
                left="0"
                h="18px"
                w="3px"
                bg={brandColor}
                borderRadius="0 4px 4px 0"
              />
            )}
          </HStack>
        </NavLink>
      );
    });
  };

  // Main function to create links
  const createLinks = (routes) => {
    return routes.map((route, index) => {
      if (route.hidden) return null;

      // Handle collapsible routes with sub-items
      if (route.collapse && route.items) {
        const isOpen = openMenus[route.name] || hasActiveChild(route.items);
        const hasActive = hasActiveChild(route.items);

        // Collapsed mode: icon with popover
        if (isCollapsed) {
          return (
            <Box key={index} mb="4px" position="relative" px="8px">
              <Popover
                isOpen={!!collapsedOpen[route.name]}
                placement="right-start"
                isLazy
                onClose={() => setCollapsedOpen(prev => ({ ...prev, [route.name]: false }))}
              >
                <PopoverTrigger>
                  <Box
                    as="button"
                    w="100%"
                    borderRadius="10px"
                    bg={hasActive ? activeBg : "transparent"}
                    _hover={{ bg: hasActive ? activeBg : hoverBg }}
                    onClick={(e) => {
                      e.preventDefault();
                      setCollapsedOpen(prev => ({ ...prev, [route.name]: !prev[route.name] }));
                    }}
                    position="relative"
                    py="8px"
                    transition="all 0.2s ease"
                  >
                    <Flex w="100%" alignItems="center" justifyContent="center">
                      <Box
                        color={hasActive ? activeIcon : inactiveIcon}
                        p="6px"
                        borderRadius="8px"
                        fontSize="20px"
                      >
                        {route.icon}
                      </Box>
                    </Flex>
                    {hasActive && (
                      <Box
                        position="absolute"
                        right="4px"
                        top="50%"
                        transform="translateY(-50%)"
                        w="5px"
                        h="5px"
                        bg={brandColor}
                        borderRadius="full"
                      />
                    )}
                  </Box>
                </PopoverTrigger>
                <Portal>
                  <PopoverContent
                    w="230px"
                    bg={popoverBg}
                    borderColor={popoverBorder}
                    boxShadow="xl"
                    borderRadius="12px"
                    _focus={{ boxShadow: "xl" }}
                    zIndex={2000}
                  >
                    <PopoverArrow bg={popoverBg} />
                    <PopoverBody p="10px">
                      <Text
                        fontSize="xs"
                        fontWeight="700"
                        color={brandColor}
                        textTransform="uppercase"
                        letterSpacing="0.5px"
                        mb="8px"
                        px="6px"
                      >
                        {route.name}
                      </Text>
                      <VStack align="stretch" spacing="3px">
                        {route.items.filter(item => !item.hidden).map((item, subIndex) => (
                          <NavLink key={subIndex} to={item.layout + item.path}>
                            <HStack
                              spacing="10px"
                              py="7px"
                              px="10px"
                              borderRadius="8px"
                              bg={isRouteActive(getFullPath(item)) ? activeBg : "transparent"}
                              _hover={{ bg: isRouteActive(getFullPath(item)) ? activeBg : hoverBg }}
                              transition="all 0.15s ease"
                            >
                              <Text
                                fontSize="sm"
                                color={isRouteActive(getFullPath(item)) ? activeColor : textColor}
                                fontWeight={isRouteActive(getFullPath(item)) ? "700" : "500"}
                              >
                                {item.name}
                              </Text>
                            </HStack>
                          </NavLink>
                        ))}
                      </VStack>
                    </PopoverBody>
                  </PopoverContent>
                </Portal>
              </Popover>
            </Box>
          );
        }

        // Expanded mode
        return (
          <Box key={index} mb="2px" px="8px">
            <Box
              onClick={() => toggleMenu(route.name)}
              cursor="pointer"
              borderRadius="10px"
              bg={hasActive ? activeBg : "transparent"}
              _hover={{
                bg: hasActive ? activeBg : hoverBg,
              }}
              transition="all 0.15s ease"
            >
              <HStack
                spacing="14px"
                py="9px"
                px="12px"
                position="relative"
              >
                <Flex w="100%" alignItems="center">
                  <Box
                    color={hasActive ? activeIcon : inactiveIcon}
                    me="14px"
                    fontSize="20px"
                    display="flex"
                    alignItems="center"
                  >
                    {route.icon}
                  </Box>
                  <Text
                    me="auto"
                    color={hasActive ? activeColor : textColor}
                    fontWeight={hasActive ? "700" : "600"}
                    fontSize="sm"
                  >
                    {route.name}
                  </Text>
                  <Icon
                    as={isOpen ? MdKeyboardArrowDown : MdKeyboardArrowRight}
                    color={hasActive ? brandColor : inactiveIcon}
                    w="18px"
                    h="18px"
                  />
                </Flex>
                {hasActive && (
                  <Box
                    position="absolute"
                    left="0"
                    h="24px"
                    w="4px"
                    bg={brandColor}
                    borderRadius="0 4px 4px 0"
                  />
                )}
              </HStack>
            </Box>
            <Collapse in={isOpen} animateOpacity>
              <VStack align="stretch" spacing="1px" mt="2px">
                {renderSubItems(route.items)}
              </VStack>
            </Collapse>
          </Box>
        );
      }

      // Handle category headers
      if (route.category) {
        return (
          <React.Fragment key={index}>
            <Text
              fontSize="xs"
              color={categoryTextColor}
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="0.8px"
              mx="auto"
              ps="20px"
              pt="18px"
              pb="6px"
              display={isCollapsed ? "none" : "block"}
            >
              {route.name}
            </Text>
            {route.items && createLinks(route.items)}
          </React.Fragment>
        );
      }

      // Handle regular links
      if (
        route.layout === "/admin" ||
        route.layout === "/auth" ||
        route.layout === "/rtl" ||
        route.layout === "/teacher" ||
        route.layout === "/student" ||
        route.layout === "/driver"
      ) {
        const fullPath = getFullPath(route);
        const active = isRouteActive(fullPath);

        const linkContent = (
          <NavLink key={index} to={route.layout + route.path}>
            <Box mb="2px" px="8px">
              <HStack
                spacing="14px"
                py="9px"
                px="12px"
                borderRadius="10px"
                position="relative"
                bg={active ? activeBg : "transparent"}
                _hover={{
                  bg: active ? activeBg : hoverBg,
                }}
                transition="all 0.15s ease"
              >
                <Flex w="100%" alignItems="center" justifyContent="center">
                  <Box
                    color={active ? activeIcon : inactiveIcon}
                    me={isCollapsed ? "0px" : "14px"}
                    fontSize="20px"
                    display="flex"
                    alignItems="center"
                  >
                    {route.icon}
                  </Box>
                  <Text
                    me="auto"
                    color={active ? activeColor : textColor}
                    fontWeight={active ? "700" : "600"}
                    fontSize="sm"
                    display={isCollapsed ? "none" : "block"}
                  >
                    {route.name}
                  </Text>
                </Flex>
                {active && (
                  <Box
                    position="absolute"
                    left="0"
                    h={isCollapsed ? "20px" : "24px"}
                    w="4px"
                    bg={brandColor}
                    borderRadius="0 4px 4px 0"
                  />
                )}
              </HStack>
            </Box>
          </NavLink>
        );

        return isCollapsed ? (
          <Tooltip key={index} label={route.name} placement="right" hasArrow>
            <Box>{linkContent}</Box>
          </Tooltip>
        ) : linkContent;
      }
    });
  };

  return createLinks(routes);
}

export default SidebarLinks;
