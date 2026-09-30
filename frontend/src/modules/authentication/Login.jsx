import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  VStack,
  HStack,
  Badge,
  IconButton,
} from '@chakra-ui/react';
import DefaultAuth from '../../layouts/auth/Default';
import {
  MdOutlineAlternateEmail,
  MdLockOutline,
  MdVisibility,
  MdVisibilityOff,
  MdArrowForward,
  MdSecurity,
  MdVerifiedUser,
  MdSpeed,
  MdVerified,
} from 'react-icons/md';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../services/api';
import { PRODUCT_LOGO, PRODUCT_NAME, PRODUCT_TAGLINE } from '../../brand';

function SignIn() {
  // Theme-aware colors
  const textColor = useColorModeValue('navy.800', 'white');
  const textColorSecondary = useColorModeValue('secondaryGray.600', 'secondaryGray.400');
  const inputBg = useColorModeValue('white', 'navy.900');
  const inputBorder = useColorModeValue('secondaryGray.200', 'whiteAlpha.200');
  const dividerColor = useColorModeValue('secondaryGray.200', 'whiteAlpha.100');
  const accessNoticeBg = useColorModeValue('teal.50', 'rgba(13, 148, 136, 0.08)');
  const accessNoticeBorderColor = useColorModeValue('teal.200', 'rgba(13, 148, 136, 0.2)');
  const accessNoticeTextColor = useColorModeValue('teal.800', 'teal.200');

  // State
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [allowedModules, setAllowedModules] = useState([]);

  // Auth Context
  const { login, clearError, loading: authLoading, error: authError, isAuthenticated } = useAuth();

  // Show/Hide password toggle
  const handleClick = () => setShow(!show);

  // Clear errors on change
  useEffect(() => {
    clearError();
  }, [clearError, isAuthenticated]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    await login(email, password, false, undefined);
  };

  return (
    <DefaultAuth>
      <Flex direction='column' w='100%' justify='center'>
        {/* Mobile Header (Shown only on small screens when left panel is hidden) */}
        <VStack spacing={2} mb='6' display={{ base: 'flex', md: 'none' }} align='center' textAlign='center'>
          <Box p='2' bg='white' borderRadius='14px' boxShadow='0 4px 12px rgba(0,0,0,0.1)'>
            <Image src={PRODUCT_LOGO} alt={PRODUCT_NAME} h='42px' w='42px' objectFit='contain' />
          </Box>
          <Heading size='md' fontWeight='800' color={textColor}>
            {PRODUCT_NAME}
          </Heading>
          <Text fontSize='xs' color={textColorSecondary} fontWeight='500'>
            {PRODUCT_TAGLINE}
          </Text>
        </VStack>

        {/* Desktop Header */}
        <Box mb='6'>
          <HStack spacing={2} mb='2'>
            <Box w='7px' h='7px' borderRadius='full' bg='brand.500' boxShadow='0 0 8px rgba(37,99,235,0.7)' />
            <Text
              fontSize='xs'
              fontWeight='700'
              letterSpacing='1.2px'
              textTransform='uppercase'
              color='brand.500'
            >
              Institutional Access
            </Text>
          </HStack>
          <Heading size='lg' fontWeight='800' color={textColor} letterSpacing='-0.5px' mb='1.5'>
            Sign In
          </Heading>
          <Text fontSize='sm' color={textColorSecondary}>
            Enter your credentials to access the campus workspace.
          </Text>
        </Box>

        {allowedModules.length > 0 && (
          <Box
            mb='5'
            p='2.5'
            px='3'
            borderRadius='12px'
            bg={accessNoticeBg}
            border='1px solid'
            borderColor={accessNoticeBorderColor}
          >
            <HStack spacing={2}>
              <Icon as={MdVerified} color='teal.500' boxSize='16px' />
              <Text fontSize='xs' fontWeight='600' color={accessNoticeTextColor}>
                Campus Access Active ({allowedModules.length} Modules Online)
              </Text>
            </HStack>
          </Box>
        )}

        {/* Error Alert */}
        {authError && (
          <Alert status='error' borderRadius='12px' mb='5' py='3' fontSize='sm'>
            <AlertIcon />
            <Text fontSize='xs' fontWeight='600'>{authError}</Text>
          </Alert>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align='stretch'>
            {/* Username / Email */}
            <FormControl isRequired>
              <FormLabel
                htmlFor='login-email'
                fontSize='xs'
                fontWeight='600'
                color={textColor}
                mb='1.5'
              >
                Email, Username, or Phone / WhatsApp Number
              </FormLabel>
              <InputGroup size='md'>
                <InputLeftElement pointerEvents='none' h='48px'>
                  <Icon as={MdOutlineAlternateEmail} color='brand.500' boxSize='18px' />
                </InputLeftElement>
                <Input
                  id='login-email'
                  type='text'
                  placeholder='Email, username, or phone number'
                  h='48px'
                  fontSize='sm'
                  borderRadius='12px'
                  bg={inputBg}
                  border='1.5px solid'
                  borderColor={inputBorder}
                  _hover={{ borderColor: 'brand.400' }}
                  _focus={{
                    borderColor: 'brand.500',
                    boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.15)',
                  }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={authLoading}
                />
              </InputGroup>
            </FormControl>

            {/* Password */}
            <FormControl isRequired>
              <FormLabel
                htmlFor='login-password'
                fontSize='xs'
                fontWeight='600'
                color={textColor}
                mb='1.5'
              >
                Password
              </FormLabel>
              <InputGroup size='md'>
                <InputLeftElement pointerEvents='none' h='48px'>
                  <Icon as={MdLockOutline} color='brand.500' boxSize='18px' />
                </InputLeftElement>
                <Input
                  id='login-password'
                  type={show ? 'text' : 'password'}
                  placeholder='Enter your password'
                  h='48px'
                  fontSize='sm'
                  borderRadius='12px'
                  bg={inputBg}
                  border='1.5px solid'
                  borderColor={inputBorder}
                  _hover={{ borderColor: 'brand.400' }}
                  _focus={{
                    borderColor: 'brand.500',
                    boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.15)',
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authLoading}
                />
                <InputRightElement h='48px'>
                  <IconButton
                    variant='ghost'
                    size='sm'
                    color={textColorSecondary}
                    _hover={{ color: 'brand.500' }}
                    icon={<Icon as={show ? MdVisibilityOff : MdVisibility} boxSize='18px' />}
                    onClick={handleClick}
                    aria-label={show ? 'Hide password' : 'Show password'}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {/* Submit Button */}
            <Button
              w='100%'
              h='50px'
              fontSize='sm'
              fontWeight='700'
              borderRadius='12px'
              bgGradient='linear(to-r, brand.600, brand.500)'
              color='white'
              boxShadow='0 10px 24px -4px rgba(37, 99, 235, 0.45)'
              _hover={{
                bgGradient: 'linear(to-r, brand.700, brand.600)',
                transform: 'translateY(-2px)',
                boxShadow: '0 14px 28px -4px rgba(37, 99, 235, 0.55)',
              }}
              _active={{ transform: 'translateY(0)' }}
              transition='all 0.2s'
              type='submit'
              isLoading={authLoading}
              isDisabled={authLoading}
              loadingText='Verifying credentials...'
              rightIcon={<Icon as={MdArrowForward} boxSize='18px' />}
              mt='2'
            >
              Sign In to Campus
            </Button>
          </VStack>
        </form>

        {/* Security & Trust Badges */}
        <HStack justify='center' spacing={4} pt='6' color={textColorSecondary} fontSize='xs'>
          <HStack spacing={1}>
            <Icon as={MdSecurity} color='teal.500' boxSize='14px' />
            <Text>256-Bit SSL</Text>
          </HStack>
          <Text color={dividerColor}>•</Text>
          <HStack spacing={1}>
            <Icon as={MdVerifiedUser} color='brand.500' boxSize='14px' />
            <Text>Role Security</Text>
          </HStack>
          <Text color={dividerColor}>•</Text>
          <HStack spacing={1}>
            <Icon as={MdSpeed} color='accent.500' boxSize='14px' />
            <Text>Fast Portal</Text>
          </HStack>
        </HStack>
      </Flex>
    </DefaultAuth>
  );
}

export default SignIn;
