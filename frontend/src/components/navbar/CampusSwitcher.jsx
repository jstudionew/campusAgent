import React, { useEffect, useState } from 'react';
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    Text,
    Icon,
    useColorModeValue,
    Box,
    Badge,
    Image,
    Flex,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { MdExpandMore, MdSchool, MdLocationCity } from 'react-icons/md';
import { campusesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function CampusSwitcher() {
    const { user, campusId, setCampusId } = useAuth();
    const [campuses, setCampuses] = useState([]);
    const [selectedCampus, setSelectedCampus] = useState(null);
    const navigate = useNavigate();

    // Function to get campus image based on campus name or ID
    const getCampusImage = (campus) => {
        if (campus?.logoUrl) return campus.logoUrl;
        
        return '/school.png';
    };

    // Colors
    const menuBg = useColorModeValue('white', 'navy.800');
    const textColor = useColorModeValue('gray.700', 'white');
    const shadow = useColorModeValue(
        '0px 18px 40px rgba(112, 144, 176, 0.12)',
        '0px 18px 40px rgba(112, 144, 176, 0.12)'
    );
    const buttonBg = useColorModeValue('gray.100', 'whiteAlpha.100');
    const buttonHover = useColorModeValue('gray.200', 'whiteAlpha.200');
    const menuItemHoverBg = useColorModeValue('gray.100', 'whiteAlpha.100');
    const menuItemActiveBg = useColorModeValue('brand.50', 'whiteAlpha.200');

    useEffect(() => {
        if (!['admin', 'owner', 'superadmin'].includes(user?.role)) return;
        let mounted = true;
        const loadCampuses = () => campusesApi.list({ pageSize: 100 })
            .then((res) => {
                if (!mounted) return;
                setCampuses(res?.rows || []);
            })
            .catch((err) => console.error('Failed to load campuses', err));
        loadCampuses();
        window.addEventListener('campus:updated', loadCampuses);
        return () => {
            mounted = false;
            window.removeEventListener('campus:updated', loadCampuses);
        };
    }, [user?.role]);

    useEffect(() => {
        if (!['admin', 'owner', 'superadmin'].includes(user?.role)) return;

        if (!campusId || String(campusId).toLowerCase() === 'all') {
            setSelectedCampus({ id: 'all', name: 'All' });
            return;
        }
        const current = campuses.find((c) => String(c.id) === String(campusId));
        setSelectedCampus(current || { id: 'all', name: 'All' });
    }, [campusId, campuses, user?.role]);

    const handleSelect = (campus) => {
        if (String(campus?.id).toLowerCase() === 'all') {
            if (!campusId || String(campusId).toLowerCase() === 'all') return;
            setSelectedCampus({ id: 'all', name: 'All' });
            setCampusId('all');
            navigate('/admin/dashboard', { replace: true });
            return;
        }

        if (String(campusId) === String(campus.id)) return;
        setSelectedCampus(campus);
        setCampusId(campus.id);
        navigate('/admin/dashboard', { replace: true });
    };

    if (!['admin', 'owner', 'superadmin'].includes(user?.role)) return null;

    return (
        <Menu closeOnSelect={true}>
            <MenuButton
                as={Button}
                rightIcon={<Icon as={MdExpandMore} color='gray.500' />}
                variant='ghost'
                bg={buttonBg}
                _hover={{ bg: buttonHover }}
                _active={{ bg: buttonHover }}
                borderRadius='30px'
                px={{ base: '10px', md: '16px' }}
                h='40px'
                mr='0'
                maxW={{ base: 'min(44vw, 190px)', md: '220px' }}
                minW='0'
            >
                <Flex alignItems='center' minW='0'>
                    <Image 
                        src={selectedCampus?.logoUrl || '/school.png'}
                        alt='Campus Logo' 
                        w='24px' 
                        h='24px' 
                        mr='8px'
                        flexShrink='0'
                        borderRadius='4px'
                        objectFit='cover'
                        fallback={<Icon as={MdSchool} color='brand.500' w='18px' h='18px' />}
                    />
                    <Text fontSize='sm' fontWeight='700' color={textColor} noOfLines={1} minW='0'>
                        {selectedCampus ? selectedCampus.name : 'Select Campus'}
                    </Text>
                </Flex>
            </MenuButton>
            <MenuList
                boxShadow={shadow}
                p='10px'
                borderRadius='20px'
                bg={menuBg}
                border='none'
                mt='10px'
                zIndex='1000'
                minW='250px'
            >
                <Text
                    px='12px'
                    py='8px'
                    fontSize='xs'
                    fontWeight='bold'
                    color='gray.400'
                    textTransform='uppercase'
                >
                    Switch Campus
                </Text>
                <MenuItem
                    key={'__all__'}
                    onClick={() => handleSelect({ id: 'all', name: 'All' })}
                    borderRadius='12px'
                    _hover={{ bg: menuItemHoverBg }}
                    bg={(!campusId || String(campusId).toLowerCase() === 'all') ? menuItemActiveBg : 'transparent'}
                    mb='4px'
                >
                    <Flex alignItems='center' flex='1'>
                        <Image 
                            src='/school.png' 
                            alt='All Campuses' 
                            w='32px' 
                            h='32px' 
                            mr='12px' 
                            borderRadius='6px'
                            objectFit='cover'
                            fallback={<Icon as={MdSchool} color='brand.500' w='20px' h='20px' mr='12px' />}
                        />
                        <Box>
                            <Text fontWeight='700' fontSize='sm' color={textColor}>
                                All
                            </Text>
                            <Text fontSize='xs' color='gray.500'>
                                All Campuses
                            </Text>
                        </Box>
                    </Flex>
                    {(!campusId || String(campusId).toLowerCase() === 'all') && (
                        <Badge ml='auto' colorScheme='brand' borderRadius='8px'>Active</Badge>
                    )}
                </MenuItem>
                {campuses.map((campus) => (
                    <MenuItem
                        key={campus.id}
                        onClick={() => handleSelect(campus)}
                        borderRadius='12px'
                        _hover={{ bg: menuItemHoverBg }}
                        bg={String(campusId) === String(campus.id) ? menuItemActiveBg : 'transparent'}
                        mb='4px'
                    >
                        <Flex alignItems='center' flex='1'>
                            <Image 
                                src={getCampusImage(campus)} 
                                alt={campus.name} 
                                w='32px' 
                                h='32px' 
                                mr='12px' 
                                borderRadius='6px'
                                objectFit='cover'
                                fallback={
                                    <Box 
                                        w='32px' 
                                        h='32px' 
                                        mr='12px' 
                                        borderRadius='6px' 
                                        bg='brand.100' 
                                        display='flex' 
                                        alignItems='center' 
                                        justifyContent='center'
                                    >
                                        <Icon as={MdLocationCity} color='brand.500' w='20px' h='20px' />
                                    </Box>
                                }
                            />
                            <Box>
                                <Text fontWeight='700' fontSize='sm' color={textColor}>
                                    {campus.name}
                                </Text>
                                <Text fontSize='xs' color='gray.500'>
                                    {campus.city || 'Main Campus'}
                                </Text>
                            </Box>
                        </Flex>
                        {String(campusId) === String(campus.id) && (
                            <Badge ml='auto' colorScheme='brand' borderRadius='8px'>Active</Badge>
                        )}
                    </MenuItem>
                ))}
            </MenuList>
        </Menu>
    );
}
