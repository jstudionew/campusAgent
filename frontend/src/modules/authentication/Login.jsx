import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  InputRightElement,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  VStack,
} from '@chakra-ui/react';
// Custom components
import DefaultAuth from '../../layouts/auth/Default';
// Assets - use custom public illustration instead of Horizon UI screen
const illustration = '/imgbin_04038f2dad4024b37accec200ae57e31.png';
import { MdOutlineRemoveRedEye } from 'react-icons/md';
import { RiEyeCloseLine } from 'react-icons/ri';
// Auth Context
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../services/api';
import { COMPANY_NAME, COMPANY_WEBSITE_LABEL, PRODUCT_LOGO, PRODUCT_NAME, PRODUCT_TAGLINE } from '../../brand';

function SignIn() {
  // Chakra color mode
  const textColor = useColorModeValue('navy.700', 'white');
  const textColorSecondary = 'gray.400';
  const brandStars = useColorModeValue('brand.500', 'brand.400');
  const googleBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.200');
  const googleText = useColorModeValue('navy.700', 'white');
  const googleHover = useColorModeValue(
    { bg: 'gray.200' },
    { bg: 'whiteAlpha.300' }
  );
  const googleActive = useColorModeValue(
    { bg: 'secondaryGray.300' },
    { bg: 'whiteAlpha.200' }
  );

  // State
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerKey, setOwnerKey] = useState('');
  const [showOwnerKey, setShowOwnerKey] = useState(false);
  const [setupMode, setSetupMode] = useState(true);
  const [allowedModules, setAllowedModules] = useState([]);
  const [ownerStep1Passed, setOwnerStep1Passed] = useState(false);
  const ownerKeyRef = useRef(null);
  const ownerKeyBlockRef = useRef(null);

  // Auth Context
  const { login, clearError, loading: authLoading, error: authError, isAuthenticated } = useAuth();

  // Handle click to show/hide password
  const handleClick = () => setShow(!show);

  // On mount and auth changes, just clear previous errors (do not auto-redirect)
  useEffect(() => {
    clearError();
  }, [clearError, isAuthenticated]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const st = await authApi.status();
        if (mounted) {
          setSetupMode(!Boolean(st?.licensingConfigured));
          setAllowedModules(Array.isArray(st?.allowedModules) ? st.allowedModules : []);
        }
      } catch (_) {
        if (mounted) setSetupMode(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    // If in setup mode or key is provided, send ownerKey directly
    if (setupMode || ownerStep1Passed || ownerKey) {
      if (setupMode && ownerKey.trim().length > 0 && ownerKey.trim().length < 30) {
        // Validation: key must be at least 30 characters
        alert('Owner license key must be at least 30 characters long.');
        return;
      }
      await login(email, password, false, ownerKey);
      return;
    }

    // Normal login attempt
    const res = await login(email, password, false, undefined);
    if (!res?.success) {
      const requiresKey =
        res?.status === 401 &&
        (res?.data?.code === 'OWNER_KEY_REQUIRED' ||
          /owner key|key not set/i.test(String(res?.error || '')) ||
          /owner key|key not set/i.test(String(res?.data?.message || '')));

      if (requiresKey) {
        // Owner credentials valid, now prompt for initial license key setup
        clearError();
        setOwnerStep1Passed(true);
        setTimeout(() => {
          try {
            ownerKeyBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            ownerKeyRef.current?.focus({ preventScroll: false });
          } catch (_) {}
        }, 100);
      }
    }
  };

  // After step 1 passes, focus license key
  useEffect(() => {
    if (ownerStep1Passed) {
      setTimeout(() => {
        try { ownerKeyRef.current?.focus({ preventScroll: false }); } catch (_) {}
      }, 0);
    }
  }, [ownerStep1Passed]);

  return (
    <DefaultAuth illustrationBackground={illustration} image={illustration}>
      <Flex
        maxW={{ base: '100%', md: 'max-content' }}
        w='100%'
        mx={{ base: 'auto', lg: '0px' }}
        me='auto'
        h='100%'
        alignItems='start'
        justifyContent='center'
        mb={{ base: '30px', md: '60px' }}
        px={{ base: '25px', md: '0px' }}
        mt={{ base: '40px', md: '14vh' }}
        flexDirection='column'>
        <Box me='auto'>
          <Image src={PRODUCT_LOGO} alt={PRODUCT_NAME} h='56px' mb='12px' objectFit='contain' />
          <Heading color={textColor} fontSize='36px' mb='10px'>
            {PRODUCT_NAME}
          </Heading>
          <Text
            mb='8px'
            ms='4px'
            color={textColorSecondary}
            fontWeight='600'
            fontSize='md'>
            {PRODUCT_TAGLINE}
          </Text>
          <Text
            mb='36px'
            ms='4px'
            color={textColorSecondary}
            fontWeight='400'
            fontSize='md'>
            School & college management portal
          </Text>
        </Box>
        
        <Flex
          zIndex='2'
          direction='column'
          w={{ base: '100%', md: '420px' }}
          maxW='100%'
          background='transparent'
          borderRadius='15px'
          mx={{ base: 'auto', lg: 'unset' }}
          me='auto'
          mb={{ base: '20px', md: 'auto' }}>
          
          {/* Status banner only; no demo credentials or autofill */}
          <Alert status='info' borderRadius='12px' mb='20px'>
            <AlertIcon />
            <VStack align='start' spacing={1} fontSize='sm'>
              {setupMode ? (
                <Text fontSize='xs' color='red.600'>System setup pending: Only Owner can sign in until licensing is configured.</Text>
              ) : (
                <Text fontSize='xs' color='gray.600'>Licensed modules active: {allowedModules.length ? allowedModules.join(', ') : 'None'}</Text>
              )}
            </VStack>
          </Alert>

          {/* Error Alert */}
          {authError && (
            <Alert status='error' borderRadius='12px' mb='20px'>
              <AlertIcon />
              {authError}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <FormControl>
              <FormLabel
                htmlFor='login-email'
                display='flex'
                ms='4px'
                fontSize='sm'
                fontWeight='500'
                color={textColor}
                mb='8px'>
                Email / Phone / Username<Text color={brandStars}>*</Text>
              </FormLabel>
              <Input
                id='login-email'
                isRequired={true}
                variant='auth'
                fontSize='sm'
                ms={{ base: '0px', md: '0px' }}
                type='text'
                placeholder='Enter email, WhatsApp number (+92...), or username'
                mb='24px'
                fontWeight='500'
                size='lg'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={authLoading}
              />
            </FormControl>

            <FormControl>
              <FormLabel
                htmlFor='login-password'
                ms='4px'
                fontSize='sm'
                fontWeight='500'
                color={textColor}
                display='flex'>
                Password<Text color={brandStars}>*</Text>
              </FormLabel>
              <InputGroup size='md'>
                <Input
                  id='login-password'
                  isRequired={true}
                  fontSize='sm'
                  placeholder='Enter your password'
                  mb='24px'
                  size='lg'
                  type={show ? 'text' : 'password'}
                  variant='auth'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authLoading}
                />
                <InputRightElement display='flex' alignItems='center' mt='4px'>
                  <Icon
                    color={textColorSecondary}
                    _hover={{ cursor: 'pointer' }}
                    as={show ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                    onClick={handleClick}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {(setupMode || ownerStep1Passed || ownerKey) ? (
              <FormControl>
                <FormLabel
                  htmlFor='login-license-key'
                  ms='4px'
                  fontSize='sm'
                  fontWeight='500'
                  color={textColor}
                  display='flex'>
                  Owner License Key (min 30 chars)<Text color={brandStars}>*</Text>
                </FormLabel>
                <InputGroup size='md' ref={ownerKeyBlockRef}>
                  <Input
                    id='login-license-key'
                    isRequired={setupMode}
                    fontSize='sm'
                    placeholder='Enter 30+ character license key to initialize'
                    mb='6px'
                    size='lg'
                    type={showOwnerKey ? 'text' : 'password'}
                    variant='auth'
                    value={ownerKey}
                    onChange={(e) => setOwnerKey(e.target.value)}
                    ref={ownerKeyRef}
                    disabled={authLoading}
                  />
                  <InputRightElement display='flex' alignItems='center' mt='4px'>
                    <Icon
                      color={textColorSecondary}
                      _hover={{ cursor: 'pointer' }}
                      as={showOwnerKey ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                      onClick={() => setShowOwnerKey(!showOwnerKey)}
                    />
                  </InputRightElement>
                </InputGroup>
                <Text fontSize='xs' color='gray.500' mb='20px' ms='4px'>
                  First-time deployment: Enter any 30+ character key of your choice to activate the system.
                </Text>
              </FormControl>
            ) : null}
            
            {/* Removed 'Keep me logged in' and 'Forgot password?' from UI */}
            
            <Button
              fontSize='sm'
              variant='brand'
              fontWeight='500'
              w='100%'
              h='50'
              mb='24px'
              type='submit'
              isLoading={authLoading}
              isDisabled={authLoading}
              loadingText='Signing in...'>
              Sign In
            </Button>
          </form>
          
          <Flex
            flexDirection='column'
            justifyContent='center'
            alignItems='start'
            maxW='100%'
            mt='0px'>
            <Text color={textColorSecondary} fontWeight='400' fontSize='14px'>
              {PRODUCT_NAME} · Developed by {COMPANY_NAME}
            </Text>
            <Text color={textColorSecondary} fontWeight='400' fontSize='14px'>
              {COMPANY_WEBSITE_LABEL}
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </DefaultAuth>
  );
}

export default SignIn;
