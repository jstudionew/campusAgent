import React, { useContext } from "react";

// chakra imports
import {
  Box,
  Flex,
  Drawer,
  DrawerBody,
  Icon,
  useColorModeValue,
  DrawerOverlay,
  useDisclosure,
  DrawerContent,
  DrawerCloseButton,
} from "@chakra-ui/react";
import Content from "components/sidebar/components/Content";
import { SidebarContext } from "contexts/SidebarContext";
import {
  renderThumb,
  renderTrack,
  renderView,
} from "components/scrollbar/Scrollbar";
import { Scrollbars } from "react-custom-scrollbars-2";
import PropTypes from "prop-types";

// Assets
import { IoMenuOutline } from "react-icons/io5";

function Sidebar(props) {
  const { routes, sidebarWidth } = props;

  useContext(SidebarContext);

  let variantChange = "0.2s linear";
  let shadow = useColorModeValue(
    "10px 14px 35px rgba(37, 99, 235, 0.05)",
    "0 18px 45px rgba(0, 0, 0, 0.55)"
  );
  // Chakra Color Mode - modern high-contrast glassmorphism
  let sidebarBg = useColorModeValue(
    "rgba(255, 255, 255, 0.92)",
    "rgba(11, 19, 41, 0.92)"
  );
  let sidebarBorder = useColorModeValue(
    "rgba(219, 234, 254, 0.9)",
    "rgba(255, 255, 255, 0.08)"
  );
  let sidebarMargins = "0px";

  // SIDEBAR
  return (
    <Box display={{ sm: "none", xl: "block" }} w={`${sidebarWidth || 260}px`} h='100vh' position='fixed' top='0' left='0' overflow='hidden' zIndex='1001'>
      <Box
        bg={sidebarBg}
        backdropFilter='blur(20px)'
        sx={{ WebkitBackdropFilter: 'blur(20px)' }}
        borderRightWidth='1px'
        borderRightStyle='solid'
        borderRightColor={sidebarBorder}
        transition={variantChange}
        w={`${sidebarWidth || 260}px`}
        h='100vh'
        m={sidebarMargins}
        minH='100%'
        overflowX='hidden'
        boxShadow={shadow}>
        
        <Scrollbars
          autoHide
          renderTrackVertical={renderTrack}
          renderThumbVertical={renderThumb}
          renderView={renderView}>
          <Content routes={routes} />
        </Scrollbars>
      </Box>
    </Box>
  );
}

// FUNCTIONS
export function SidebarResponsive(props) {
  let sidebarBackgroundColor = useColorModeValue(
    'rgba(255, 255, 255, 0.96)',
    'rgba(11, 19, 41, 0.96)'
  );
  let sidebarBorderColor = useColorModeValue(
    'rgba(219, 234, 254, 0.9)',
    'rgba(255, 255, 255, 0.08)'
  );
  let menuColor = useColorModeValue("secondaryGray.700", "white");
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = React.useRef();

  const { routes } = props;

  return (
    <Flex display={{ sm: "flex", xl: "none" }} alignItems='center'>
      <Flex ref={btnRef} w='max-content' h='max-content' onClick={onOpen}>
        <Icon
          as={IoMenuOutline}
          color={menuColor}
          my='auto'
          w='22px'
          h='22px'
          me='10px'
          _hover={{ cursor: "pointer", color: "brand.500" }}
          transition="color 0.2s ease"
        />
      </Flex>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        placement={document.documentElement.dir === "rtl" ? "right" : "left"}
        finalFocusRef={btnRef}>
        <DrawerOverlay backdropFilter='blur(6px)' />
        <DrawerContent
          w='285px'
          maxW='285px'
          bg={sidebarBackgroundColor}
          backdropFilter='blur(20px)'
          sx={{ WebkitBackdropFilter: 'blur(20px)' }}
          borderRightWidth={document.documentElement.dir === "rtl" ? '0px' : '1px'}
          borderLeftWidth={document.documentElement.dir === "rtl" ? '1px' : '0px'}
          borderColor={sidebarBorderColor}
          boxShadow="xl"
        >
          <DrawerCloseButton
            zIndex='3'
            onClose={onClose}
            _focus={{ boxShadow: "none" }}
            _hover={{ color: "brand.500" }}
          />
          <DrawerBody maxW='285px' px='0rem' pb='0'>
            <Scrollbars
              autoHide
              renderTrackVertical={renderTrack}
              renderThumbVertical={renderThumb}
              renderView={renderView}>
              <Content routes={routes} />
            </Scrollbars>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}

Sidebar.propTypes = {
  logoText: PropTypes.string,
  routes: PropTypes.arrayOf(PropTypes.object),
  variant: PropTypes.string,
};

export default Sidebar;
