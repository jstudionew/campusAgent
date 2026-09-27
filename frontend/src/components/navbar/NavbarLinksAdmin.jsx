// Chakra Imports
import {
  Avatar,
  Button,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  useColorMode,
  Tooltip,
} from '@chakra-ui/react';
// Custom Components
import { ItemContent } from '../../components/menu/ItemContent';
import { SearchBar } from '../../components/navbar/searchBar/SearchBar';
import { SidebarResponsive } from '../../components/sidebar/Sidebar';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Assets
import { MdNotificationsNone } from 'react-icons/md';
import { IoMdMoon, IoMdSunny } from 'react-icons/io';
import routes from '../../routes';
import { useAuth } from '../../contexts/AuthContext';
import { campusesApi } from '../../services/api';
import CampusSwitcher from './CampusSwitcher';

export default function HeaderLinks(props) {
  const { secondary } = props;
  const { colorMode, toggleColorMode } = useColorMode();
  const { user, logout } = useAuth();
  const [campuses, setCampuses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'owner') {
      campusesApi.list({ pageSize: 100 })
        .then(res => setCampuses(res.rows || []))
        .catch(err => console.error('Failed to load campuses for switcher', err));
    }
  }, [user?.role]);

  // Chakra Color Mode
  const navbarIcon = useColorModeValue('secondaryGray.600', 'secondaryGray.300');
  const iconHover = useColorModeValue('brand.500', 'brand.300');
  let menuBg = useColorModeValue('white', 'navy.800');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textColorBrand = useColorModeValue('brand.600', 'brand.300');
  const borderColor = useColorModeValue('secondaryGray.200', 'whiteAlpha.200');
  const shadow = useColorModeValue(
    '0 10px 30px rgba(37, 99, 235, 0.08)',
    '0 12px 35px rgba(0, 0, 0, 0.45)',
  );
  
  const displayName = (user?.name || user?.fullName || (user?.email ? user.email.split('@')[0] : '') || 'User').trim();
  const firstName = displayName.split(' ')[0] || displayName;

  const handleProfileClick = () => {
    if (user?.role === 'teacher') {
      navigate('/teacher/settings/profile');
    } else if (user?.role === 'student') {
      navigate('/student/settings/profile');
    } else if (user?.role === 'driver') {
      navigate('/driver/settings');
    } else {
      navigate('/admin/settings/system');
    }
  };

  const handleSecurityClick = () => {
    if (user?.role === 'teacher') {
      navigate('/teacher/settings/password');
    } else if (user?.role === 'student') {
      navigate('/student/settings/password');
    } else if (user?.role === 'driver') {
      navigate('/driver/settings');
    } else {
      navigate('/admin/settings/users');
    }
  };

  return (
    <Flex
      w={{ sm: '100%', md: 'auto' }}
      alignItems="center"
      flexDirection="row"
      bg={menuBg}
      flexWrap={secondary ? { base: 'wrap', md: 'nowrap' } : 'unset'}
      p="8px"
      borderRadius="20px"
      boxShadow={shadow}
      border="1px solid"
      borderColor={borderColor}
    >
      <SearchBar
        mb={() => {
          if (secondary) {
            return { base: '10px', md: 'unset' };
          }
          return 'unset';
        }}
        me="10px"
        borderRadius="12px"
      />

      <SidebarResponsive routes={routes} />

      <CampusSwitcher />

      {/* Notifications Menu */}
      <Menu>
        <MenuButton p="6px" borderRadius="10px" _hover={{ bg: useColorModeValue('brand.50', 'whiteAlpha.100') }}>
          <Icon
            as={MdNotificationsNone}
            color={navbarIcon}
            _hover={{ color: iconHover }}
            w="20px"
            h="20px"
            mt="4px"
            transition="color 0.2s ease"
          />
        </MenuButton>
        <MenuList
          boxShadow={shadow}
          p="16px"
          borderRadius="16px"
          bg={menuBg}
          border="1px solid"
          borderColor={borderColor}
          mt="14px"
          me={{ base: '20px', md: 'unset' }}
          minW={{ base: 'unset', md: '360px', xl: '400px' }}
          zIndex="1100"
        >
          <Flex w="100%" mb="14px" alignItems="center">
            <Text fontSize="md" fontWeight="700" color={textColor}>
              Notifications
            </Text>
            <Text
              fontSize="xs"
              fontWeight="600"
              color={textColorBrand}
              ms="auto"
              cursor="pointer"
              _hover={{ textDecoration: 'underline' }}
            >
              Mark all read
            </Text>
          </Flex>
          <Flex flexDirection="column" gap="8px">
            <MenuItem
              _hover={{ bg: useColorModeValue('brand.50', 'whiteAlpha.100') }}
              borderRadius="10px"
              p="8px"
            >
              <ItemContent info="CampusAgent" />
            </MenuItem>
            <MenuItem
              _hover={{ bg: useColorModeValue('brand.50', 'whiteAlpha.100') }}
              borderRadius="10px"
              p="8px"
            >
              <ItemContent info="J-Studio" />
            </MenuItem>
          </Flex>
        </MenuList>
      </Menu>

      {/* Dark/Light Mode Toggle */}
      <Tooltip label={colorMode === 'light' ? 'Switch to Dark mode' : 'Switch to Light mode'} hasArrow>
        <Button
          variant="ghost"
          p="6px"
          minW="unset"
          minH="unset"
          h="34px"
          w="34px"
          borderRadius="10px"
          _hover={{ bg: useColorModeValue('brand.50', 'whiteAlpha.100') }}
          onClick={toggleColorMode}
          mx="4px"
        >
          <Icon
            h="18px"
            w="18px"
            color={navbarIcon}
            _hover={{ color: iconHover }}
            as={colorMode === 'light' ? IoMdMoon : IoMdSunny}
            transition="color 0.2s ease"
          />
        </Button>
      </Tooltip>

      {/* User Profile Menu */}
      <Menu>
        <MenuButton p="0px" ms="4px">
          <Avatar
            _hover={{ cursor: 'pointer', transform: 'scale(1.05)' }}
            transition="all 0.2s ease"
            color="white"
            name={displayName}
            bg="brand.500"
            size="sm"
            w="38px"
            h="38px"
          />
        </MenuButton>
        <MenuList
          boxShadow={shadow}
          p="8px"
          mt="12px"
          borderRadius="16px"
          bg={menuBg}
          border="1px solid"
          borderColor={borderColor}
          zIndex="1100"
        >
          <Flex w="100%" mb="4px" direction="column">
            <Text
              px="14px"
              pt="8px"
              pb="4px"
              fontSize="sm"
              fontWeight="700"
              color={textColor}
            >
              👋&nbsp; Hey, {firstName}
            </Text>
            <Text
              px="14px"
              pb="8px"
              fontSize="xs"
              color="secondaryGray.500"
              borderBottom="1px solid"
              borderColor={borderColor}
            >
              {user?.role ? user.role.toUpperCase() : 'USER'}
            </Text>
          </Flex>
          <Flex flexDirection="column" gap="2px" pt="4px">
            <MenuItem
              _hover={{ bg: useColorModeValue('brand.50', 'whiteAlpha.100') }}
              borderRadius="8px"
              px="14px"
              py="8px"
              onClick={handleProfileClick}
            >
              <Text fontSize="sm" fontWeight="500">Profile Settings</Text>
            </MenuItem>
            <MenuItem
              _hover={{ bg: useColorModeValue('brand.50', 'whiteAlpha.100') }}
              borderRadius="8px"
              px="14px"
              py="8px"
              onClick={handleSecurityClick}
            >
              <Text fontSize="sm" fontWeight="500">Security & Access</Text>
            </MenuItem>
            <MenuItem
              _hover={{ bg: useColorModeValue('red.50', 'whiteAlpha.100') }}
              color="red.500"
              borderRadius="8px"
              px="14px"
              py="8px"
              onClick={() => logout()}
            >
              <Text fontSize="sm" fontWeight="600">Log out</Text>
            </MenuItem>
          </Flex>
        </MenuList>
      </Menu>
    </Flex>
  );
}

HeaderLinks.propTypes = {
  variant: PropTypes.string,
  fixed: PropTypes.bool,
  secondary: PropTypes.bool,
  onOpen: PropTypes.func,
};
