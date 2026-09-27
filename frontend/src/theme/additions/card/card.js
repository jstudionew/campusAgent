import { mode } from '@chakra-ui/theme-tools';

const Card = {
  baseStyle: (props) => ({
    p: { base: '16px', md: '20px' },
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    position: 'relative',
    borderRadius: '16px',
    minWidth: '0px',
    wordWrap: 'break-word',
    bg: mode(
      'rgba(255, 255, 255, 0.85)',
      'rgba(17, 28, 68, 0.85)'
    )(props),
    boxShadow: mode(
      '0 8px 24px rgba(37, 99, 235, 0.06)',
      '0 12px 35px rgba(0, 0, 0, 0.5)'
    )(props),
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mode(
      'rgba(219, 234, 254, 0.8)',
      'rgba(255, 255, 255, 0.08)'
    )(props),
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    backgroundClip: 'border-box',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  }),
};

export const CardComponent = {
  components: {
    Card,
  },
};

export default CardComponent;
