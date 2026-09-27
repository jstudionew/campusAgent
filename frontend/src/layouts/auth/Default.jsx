// Chakra imports
import {
  Box,
  Flex,
  Image,
  Text,
  useColorModeValue,
  HStack,
  VStack,
  Icon,
} from "@chakra-ui/react";
import PropTypes from "prop-types";
import React from "react";
import FixedPlugin from "components/fixedPlugin/FixedPlugin";
import {
  MdSchool,
  MdAccountBalanceWallet,
  MdDirectionsBus,
} from "react-icons/md";
import {
  COMPANY_LOGO,
  COMPANY_NAME,
  COMPANY_WEBSITE_LABEL,
  PRODUCT_LOGO,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
} from "../../brand";

function AuthIllustration(props) {
  const { children } = props;

  const pageBg = useColorModeValue(
    'radial-gradient(ellipse at 15% 15%, rgba(37, 99, 235, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, rgba(13, 148, 136, 0.06) 0%, transparent 50%), linear-gradient(135deg, #F1F5F9 0%, #F8FAFC 50%, #EEF4FF 100%)',
    'radial-gradient(ellipse at 15% 15%, rgba(37, 99, 235, 0.16) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, rgba(13, 148, 136, 0.1) 0%, transparent 50%), linear-gradient(135deg, #050B18 0%, #0A1227 45%, #0F1C3F 100%)'
  );
  const cardBg = useColorModeValue('white', 'navy.800');
  const cardBorder = useColorModeValue('rgba(219, 234, 254, 0.9)', 'whiteAlpha.100');
  const leftPanelBg = useColorModeValue(
    'linear-gradient(145deg, #1E3A8A 0%, #1D4ED8 35%, #2563EB 75%, #3B82F6 100%)',
    'linear-gradient(145deg, #060D1F 0%, #0B1736 45%, #112255 100%)'
  );

  return (
    <Flex
      position='relative'
      minH='100vh'
      w='100%'
      bg={pageBg}
      align='center'
      justify='center'
      py={{ base: "6", md: "10" }}
      px={{ base: "4", sm: "6" }}
    >
      <Box
        w='100%'
        maxW='1140px'
        bg={cardBg}
        borderRadius={{ base: '20px', md: '28px' }}
        border='1px solid'
        borderColor={cardBorder}
        boxShadow={useColorModeValue(
          '0 25px 60px -12px rgba(37, 99, 235, 0.15), 0 0 35px rgba(37, 99, 235, 0.06)',
          '0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 35px rgba(37, 99, 235, 0.12)'
        )}
        overflow='hidden'
        position='relative'
      >
        <Flex direction={{ base: "column", md: "row" }} w='100%' minH={{ md: "640px" }}>
          {/* Left Branded Showcase Panel */}
          <Box
            w={{ base: "100%", md: "48%", lg: "46%" }}
            display={{ base: "none", md: "flex" }}
            flexDirection='column'
            justifyContent='space-between'
            bg={leftPanelBg}
            borderRightWidth='1px'
            borderColor={cardBorder}
            p={{ md: "8", lg: "10" }}
            position='relative'
            overflow='hidden'
          >
            {/* Ambient Background Lighting Orbs */}
            <Box
              position='absolute'
              top='-60px'
              right='-60px'
              w='220px'
              h='220px'
              bg='cyan.400'
              opacity='0.22'
              filter='blur(50px)'
              borderRadius='full'
              pointerEvents='none'
            />
            <Box
              position='absolute'
              bottom='-40px'
              left='-40px'
              w='180px'
              h='180px'
              bg='accent.500'
              opacity='0.16'
              filter='blur(45px)'
              borderRadius='full'
              pointerEvents='none'
            />

            {/* Top Branding Section */}
            <Box position='relative' zIndex={2}>
              {/* Badge Chip */}
              <HStack
                spacing={2}
                px='3'
                py='1'
                borderRadius='full'
                bg='whiteAlpha.200'
                border='1px solid rgba(255,255,255,0.22)'
                backdropFilter='blur(8px)'
                mb='5'
                w='fit-content'
              >
                <Box w='6px' h='6px' borderRadius='full' bg='cyan.300' boxShadow='0 0 8px #67E8F9' />
                <Text fontSize='10px' fontWeight='700' letterSpacing='1px' color='white'>
                  CAMPUS ENTERPRISE OS
                </Text>
              </HStack>

              {/* Product Logo & Name */}
              <HStack spacing={3.5} mb='3' align='center'>
                <Box
                  p='2'
                  bg='white'
                  borderRadius='14px'
                  boxShadow='0 8px 20px rgba(0,0,0,0.18)'
                >
                  <Image
                    src={PRODUCT_LOGO}
                    alt={PRODUCT_NAME}
                    h='40px'
                    w='40px'
                    objectFit='contain'
                  />
                </Box>
                <Box>
                  <Text fontSize='26px' fontWeight='800' color='white' letterSpacing='-0.5px' lineHeight='1.1'>
                    {PRODUCT_NAME}
                  </Text>
                  <Text fontSize='xs' fontWeight='600' color='blue.200' letterSpacing='0.3px'>
                    Unified Academic Operations
                  </Text>
                </Box>
              </HStack>

              <Text fontSize='14px' color='white' fontWeight='600' mb='1.5'>
                {PRODUCT_TAGLINE}
              </Text>
              <Text fontSize='xs' color='blue.100' mb='6' lineHeight='1.6' opacity={0.92}>
                A complete institutional operating system unifying academic administration, automated financial accounting, fleet operations, and intelligent reporting.
              </Text>

              {/* 3 Value Pillars */}
              <VStack spacing={2.5} align='stretch' mb='6'>
                <HStack
                  p='3'
                  borderRadius='14px'
                  bg='whiteAlpha.100'
                  border='1px solid rgba(255,255,255,0.12)'
                  backdropFilter='blur(10px)'
                  spacing={3}
                  transition='all 0.2s'
                  _hover={{ bg: 'whiteAlpha.200', transform: 'translateX(2px)' }}
                >
                  <Flex
                    w='34px'
                    h='34px'
                    borderRadius='10px'
                    bg='whiteAlpha.200'
                    align='center'
                    justify='center'
                    flexShrink={0}
                  >
                    <Icon as={MdSchool} color='cyan.200' boxSize='18px' />
                  </Flex>
                  <Box>
                    <Text fontSize='xs' fontWeight='700' color='white'>
                      Academic & Student Hub
                    </Text>
                    <Text fontSize='11px' color='blue.100' opacity={0.88}>
                      Automated attendance, grading matrices & lifecycle records.
                    </Text>
                  </Box>
                </HStack>

                <HStack
                  p='3'
                  borderRadius='14px'
                  bg='whiteAlpha.100'
                  border='1px solid rgba(255,255,255,0.12)'
                  backdropFilter='blur(10px)'
                  spacing={3}
                  transition='all 0.2s'
                  _hover={{ bg: 'whiteAlpha.200', transform: 'translateX(2px)' }}
                >
                  <Flex
                    w='34px'
                    h='34px'
                    borderRadius='10px'
                    bg='whiteAlpha.200'
                    align='center'
                    justify='center'
                    flexShrink={0}
                  >
                    <Icon as={MdAccountBalanceWallet} color='accent.300' boxSize='18px' />
                  </Flex>
                  <Box>
                    <Text fontSize='xs' fontWeight='700' color='white'>
                      Finance & Fee Automation
                    </Text>
                    <Text fontSize='11px' color='blue.100' opacity={0.88}>
                      Multi-term billing, live payment receipts & audited ledgers.
                    </Text>
                  </Box>
                </HStack>

                <HStack
                  p='3'
                  borderRadius='14px'
                  bg='whiteAlpha.100'
                  border='1px solid rgba(255,255,255,0.12)'
                  backdropFilter='blur(10px)'
                  spacing={3}
                  transition='all 0.2s'
                  _hover={{ bg: 'whiteAlpha.200', transform: 'translateX(2px)' }}
                >
                  <Flex
                    w='34px'
                    h='34px'
                    borderRadius='10px'
                    bg='whiteAlpha.200'
                    align='center'
                    justify='center'
                    flexShrink={0}
                  >
                    <Icon as={MdDirectionsBus} color='teal.200' boxSize='18px' />
                  </Flex>
                  <Box>
                    <Text fontSize='xs' fontWeight='700' color='white'>
                      Fleet Telemetry & Security
                    </Text>
                    <Text fontSize='11px' color='blue.100' opacity={0.88}>
                      Real-time GPS vehicle tracking, route alerts & safety check-ins.
                    </Text>
                  </Box>
                </HStack>
              </VStack>
            </Box>

            {/* Bottom Proof Strip & Company Signature */}
            <Box position='relative' zIndex={2} pt='2'>
              <HStack
                justify='space-between'
                p='3'
                px='4'
                bg='whiteAlpha.150'
                borderRadius='14px'
                border='1px solid rgba(255,255,255,0.16)'
                backdropFilter='blur(12px)'
                mb='4'
              >
                <VStack spacing={0} align='start'>
                  <Text fontSize='13px' fontWeight='800' color='white'>
                    99.98%
                  </Text>
                  <Text fontSize='10px' color='blue.200'>
                    Uptime SLA
                  </Text>
                </VStack>
                <Box h='22px' w='1px' bg='whiteAlpha.300' />
                <VStack spacing={0} align='start'>
                  <Text fontSize='13px' fontWeight='800' color='white'>
                    40+ Core
                  </Text>
                  <Text fontSize='10px' color='blue.200'>
                    Modules
                  </Text>
                </VStack>
                <Box h='22px' w='1px' bg='whiteAlpha.300' />
                <VStack spacing={0} align='start'>
                  <Text fontSize='13px' fontWeight='800' color='white'>
                    256-Bit
                  </Text>
                  <Text fontSize='10px' color='blue.200'>
                    Encrypted
                  </Text>
                </VStack>
              </HStack>

              <Flex align='center' gap='8px'>
                <Image src={COMPANY_LOGO} alt={COMPANY_NAME} h='18px' objectFit='contain' />
                <Text fontSize='xs' color='blue.100'>
                  Developed by <Text as='span' fontWeight='700' color='white'>{COMPANY_NAME}</Text> · {COMPANY_WEBSITE_LABEL}
                </Text>
              </Flex>
            </Box>
          </Box>

          {/* Right Form Panel */}
          <Box
            w={{ base: "100%", md: "52%", lg: "54%" }}
            px={{ base: "6", sm: "8", md: "10", lg: "12" }}
            py={{ base: "8", md: "10" }}
            display='flex'
            alignItems='center'
            justifyContent='center'
          >
            <Box w='100%' maxW='440px'>
              {children}
            </Box>
          </Box>
        </Flex>
      </Box>
      <FixedPlugin />
    </Flex>
  );
}

AuthIllustration.propTypes = {
  children: PropTypes.node,
};

export default AuthIllustration;
