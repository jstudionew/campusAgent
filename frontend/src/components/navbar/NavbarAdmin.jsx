// Chakra Imports
import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import React, { useState, useEffect, useContext } from 'react';
import { SidebarContext } from 'contexts/SidebarContext';
import AdminNavbarLinks from 'components/navbar/NavbarLinksAdmin';

export default function AdminNavbar(props) {
	const [scrolled, setScrolled] = useState(false);
	const { toggleSidebar } = useContext(SidebarContext) || {};
	const sidebarWidth = toggleSidebar ? 80 : 260;
	const { secondary, message, brandText } = props;

	const changeNavbar = () => {
		if (window.scrollY > 1) {
			setScrolled(true);
		} else {
			setScrolled(false);
		}
	};

	useEffect(() => {
		window.addEventListener('scroll', changeNavbar);

		return () => {
			window.removeEventListener('scroll', changeNavbar);
		};
	}, []);
	const theme = useColorModeValue(
		{
			mainText: 'secondaryGray.900',
			navbarBg: scrolled ? 'rgba(255, 255, 255, 0.85)' : 'rgba(240, 245, 255, 0.2)',
			navbarBorder: scrolled ? 'rgba(219, 234, 254, 0.7)' : 'transparent',
			navbarShadow: scrolled ? '0 4px 20px rgba(37, 99, 235, 0.05)' : 'none',
		},
		{
			mainText: 'white',
			navbarBg: scrolled ? 'rgba(11, 19, 41, 0.85)' : 'rgba(11, 19, 41, 0.4)',
			navbarBorder: scrolled ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
			navbarShadow: scrolled ? '0 4px 20px rgba(0, 0, 0, 0.4)' : 'none',
		}
	);

	const mainText = theme.mainText;
	const navbarPosition = 'fixed';
	const navbarBackdrop = 'blur(20px)';
	const navbarBg = theme.navbarBg;
	const navbarBorder = theme.navbarBorder;
	const navbarShadow = theme.navbarShadow;
	const paddingX = '15px';

	return (
		<Box
			position={navbarPosition}
			boxShadow={navbarShadow}
			zIndex='1000'
			bg={navbarBg}
			borderBottom='1px solid'
			borderColor={navbarBorder}
			backdropFilter={navbarBackdrop}
			sx={{ WebkitBackdropFilter: navbarBackdrop }}
			transition='all 0.25s ease'
			alignItems={{ xl: 'center' }}
			display={secondary ? 'block' : 'flex'}
			minH='75px'
			justifyContent={{ xl: 'center' }}
			lineHeight='25.6px'
			mx='auto'
			pb='8px'
			right={{ base: '12px', md: '30px', lg: '30px', xl: '0px' }}
			px={{
				sm: paddingX,
				md: '10px'
			}}
			ps={{
				xl: '16px'
			}}
			pt='8px'
			top='0px'
			left={{ base: '12px', md: '30px', lg: '30px', xl: `${sidebarWidth}px` }}
			w={{
				base: 'calc(100vw - 24px)',
				md: 'calc(100vw - 60px)',
				lg: 'calc(100vw - 60px)',
				xl: 'auto',
				'2xl': 'auto'
			}}>
			<Flex
				w='100%'
				flexDirection={{
					base: 'column',
					md: 'row'
				}}
				alignItems={{ base: 'stretch', md: 'center' }}
				flexWrap={{ base: 'nowrap', md: 'wrap' }}
				gap={{ base: '8px', md: '12px' }}>
				<Box mb={{ sm: '8px', md: '0px' }}>
					<Text
						color={mainText}
						fontWeight='800'
						fontSize={{ base: '20px', md: '26px' }}
						letterSpacing='-0.5px'
					>
						{brandText && brandText !== 'Default Brand Text' ? brandText : 'CampusAgent'}
					</Text>
				</Box>
				<Box
					ms={{ base: 0, md: 'auto' }}
					w={{ base: '100%', md: 'auto' }}
					minW={0}
				>
					<AdminNavbarLinks
						onOpen={props.onOpen}
						logoText={props.logoText}
						secondary={props.secondary}
						fixed={props.fixed}
						scrolled={scrolled}
						routes={props.routes}
					/>
				</Box>
			</Flex>
			{secondary ? <Text color='white'>{message}</Text> : null}
		</Box>
	);
}

AdminNavbar.propTypes = {
	brandText: PropTypes.string,
	variant: PropTypes.string,
	secondary: PropTypes.bool,
	fixed: PropTypes.bool,
	onOpen: PropTypes.func,
	routes: PropTypes.arrayOf(PropTypes.object)
};
