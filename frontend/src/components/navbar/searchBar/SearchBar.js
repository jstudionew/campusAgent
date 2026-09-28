import React, { useMemo, useState } from 'react';
import {
  Box,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Portal,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { searchAccessibleRoutes } from './routeSearch';

export function SearchBar({ routes = [], placeholder = 'Search pages...', ...inputGroupProps }) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const results = useMemo(() => searchAccessibleRoutes(routes, query), [routes, query]);
  const isOpen = isFocused && query.trim().length > 0;

  const inputBg = useColorModeValue('gray.100', 'whiteAlpha.100');
  const inputHoverBg = useColorModeValue('gray.50', 'whiteAlpha.200');
  const menuBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const secondaryText = useColorModeValue('gray.500', 'gray.400');
  const activeBg = useColorModeValue('blue.50', 'whiteAlpha.100');
  const iconColor = useColorModeValue('gray.500', 'gray.400');
  const resultIconBg = useColorModeValue('blue.50', 'whiteAlpha.100');
  const resultIconColor = useColorModeValue('blue.600', 'blue.200');

  const openResult = (result) => {
    if (!result) return;
    navigate(result.path);
    setQuery('');
    setIsFocused(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results.length) {
      event.preventDefault();
      openResult(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsFocused(false);
    }
  };

  return (
    <Popover
      isOpen={isOpen}
      onClose={() => setIsFocused(false)}
      placement="bottom-start"
      matchWidth
      autoFocus={false}
      closeOnBlur
    >
      <PopoverAnchor>
        <InputGroup w="full" {...inputGroupProps}>
          <InputLeftElement pointerEvents="none" h="full">
            <SearchIcon color={iconColor} boxSize="15px" />
          </InputLeftElement>
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            aria-label={placeholder}
            aria-autocomplete="list"
            aria-controls="global-search-results"
            aria-expanded={isOpen}
            aria-activedescendant={isOpen && results[activeIndex]
              ? `global-search-result-${activeIndex}`
              : undefined}
            bg={inputBg}
            color={textColor}
            fontSize="sm"
            fontWeight="500"
            border="1px solid"
            borderColor="transparent"
            borderRadius="14px"
            h="46px"
            pr="12px"
            _placeholder={{ color: secondaryText }}
            _hover={{ bg: inputHoverBg, borderColor }}
            _focusVisible={{
              bg: menuBg,
              borderColor: 'blue.400',
              boxShadow: '0 0 0 3px var(--chakra-colors-blue-100)',
            }}
          />
          {query && (
            <InputRightElement h="full" width="2.5rem">
              <Box
                as="button"
                type="button"
                aria-label="Clear search"
                color={secondaryText}
                fontSize="lg"
                lineHeight="1"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery('');
                  setActiveIndex(0);
                }}
              >
                ×
              </Box>
            </InputRightElement>
          )}
        </InputGroup>
      </PopoverAnchor>
      <Portal>
        <PopoverContent
          w={{ base: 'min(92vw, 420px)', md: '420px' }}
          maxW="calc(100vw - 24px)"
          maxH="min(60vh, 420px)"
          overflowY="auto"
          bg={menuBg}
          color={textColor}
          borderColor={borderColor}
          borderRadius="16px"
          boxShadow={useColorModeValue(
            '0 18px 50px rgba(15, 23, 42, 0.16)',
            '0 18px 50px rgba(0, 0, 0, 0.45)'
          )}
          p="2"
          zIndex="1500"
        >
          <Text px="3" pt="2" pb="1" fontSize="xs" fontWeight="700" color={secondaryText}>
            PAGES AND FEATURES
          </Text>
          <Box id="global-search-results" role="listbox">
            {results.length ? results.map((result, index) => (
            <Flex
              as="button"
              type="button"
              id={`global-search-result-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              key={result.path}
              w="full"
              align="center"
              textAlign="left"
              gap="3"
              px="3"
              py="2.5"
              borderRadius="12px"
              bg={index === activeIndex ? activeBg : 'transparent'}
              _hover={{ bg: activeBg }}
              onPointerDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => openResult(result)}
            >
              <Flex
                align="center"
                justify="center"
                flexShrink="0"
                boxSize="9"
                borderRadius="11px"
                bg={resultIconBg}
                color={resultIconColor}
              >
                <SearchIcon boxSize="14px" />
              </Flex>
              <Box minW="0" flex="1">
                <Text fontSize="sm" fontWeight="600" noOfLines={1}>{result.name}</Text>
                <Text fontSize="xs" color={secondaryText} noOfLines={1}>
                  {[result.group, result.path].filter(Boolean).join(' · ')}
                </Text>
              </Box>
              <Text flexShrink="0" fontSize="xs" color={secondaryText}>Open</Text>
            </Flex>
            )) : (
            <Text role="option" aria-disabled="true" px="3" py="4" fontSize="sm" color={secondaryText}>
              No accessible pages match “{query}”.
            </Text>
            )}
          </Box>
          {!!results.length && (
            <Text px="3" pt="2" pb="1" fontSize="xs" color={secondaryText}>
              Use ↑ ↓ to navigate, Enter to open, Esc to close
            </Text>
          )}
        </PopoverContent>
      </Portal>
    </Popover>
  );
}
