import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'grape',
  fontFamily: 'Poppins, JetBrains Mono, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily: 'Poppins, JetBrains Mono, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '700',
  },
  colors: {
    grape: [
      '#f8f0fc', '#f3d9fa', '#eebefa', '#e599f7', '#da77f2', '#cc5de8', '#be4bdb', '#ae3ec9', '#9c36b5', '#862e9c'
    ],
    cyan: [
      '#e3fafc', '#c5f6fa', '#99e9f2', '#66d9e8', '#3bc9db', '#22b8cf', '#15aabf', '#1098ad', '#0c8599', '#0b7285'
    ],
    darkBg: [
      '#1a1b1e', // Darkest background
      '#232526', // Slightly lighter
      '#2c2e33', // Even lighter
      '#343a40', // Another shade
      '#495057', // Lighter still
      '#868e96', // Gray
      '#adb5bd', // Light gray
      '#ced4da', // Lighter gray
      '#e9ecef', // Very light gray
      '#f8f9fa'  // Lightest background
    ],
    componentBg: [
      'rgba(40,40,60,0.85)', // Main component background with blur
      'rgba(50,50,70,0.85)', // Slightly lighter for inputs
      'rgba(40,40,60,0.95)', // For modals
      'rgba(40,40,60,0.95)', // For modals
      'rgba(40,40,60,0.95)', // For modals
      'rgba(40,40,60,0.95)', // For modals
      'rgba(40,40,60,0.95)', // For modals
      'rgba(40,40,60,0.95)', // For modals
      'rgba(40,40,60,0.95)', // For modals
      'rgba(40,40,60,0.95)', // For modals
      'rgba(40,40,60,0.95)', // For modals
    ],
    componentBorder: [
      'rgba(132, 94, 247, 0.3)', // Subtle border using grape color
      'rgba(132, 94, 247, 0.3)', // Subtle border using grape color
      'rgba(132, 94, 247, 0.3)', // Subtle border using grape color
      'rgba(132, 94, 247, 0.3)', // Subtle border using grape color
      'rgba(132, 94, 247, 0.3)', // Subtle border using grape color
      'rgba(132, 94, 247, 0.3)', // Subtle border using grape color
      'rgba(132, 94, 247, 0.3)', // Subtle border using grape color
      'rgba(132, 94, 247, 0.3)', // Subtle border using grape color
      'rgba(132, 94, 247, 0.3)', // Subtle border using grape color
      'rgba(132, 94, 247, 0.3)', // Subtle border using grape color
      'rgba(132, 94, 247, 0.3)', // Subtle border using grape color
    ],
  },
  defaultRadius: 'md',
  defaultGradient: { from: 'grape', to: 'cyan', deg: 90 },
  shadows: {
    md: '0 4px 12px rgba(0, 0, 0, 0.2)', // Custom shadow for better depth
  },
  components: {
    Card: {
      styles: (theme: any, _params: any, _ctx: any) => {
        return {
          root: {
            background: theme.colors.componentBg[0],
            color: theme.white,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${theme.colors.componentBorder[0]}`, // Use componentBorder
            boxShadow: theme.shadows.md,
          },
        };
      },
    },
    Paper: {
      styles: (theme: any, _params: any, _ctx: any) => {
        return {
          root: {
            background: theme.colors.componentBg[0],
            color: theme.white,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${theme.colors.componentBorder[0]}`, // Use componentBorder
            boxShadow: theme.shadows.md,
          },
        };
      },
    },
    Modal: {
      styles: (theme: any, _params: any, _ctx: any) => {
        return {
          content: {
            background: theme.colors.componentBg[2],
            color: theme.white,
            border: `1px solid ${theme.colors.componentBorder[0]}`, // Use componentBorder
            boxShadow: theme.shadows.md,
          },
          header: {
            background: theme.colors.componentBg[2],
            color: theme.white,
            borderBottom: 'none',
          },
          title: {
            color: theme.white,
          },
        };
      },
    },
    TextInput: {
      styles: (theme: any, _params: any, _ctx: any) => {
        return {
          input: {
            background: theme.colors.componentBg[1],
            color: theme.white,
            border: `1px solid ${theme.colors.componentBorder[0]}`, // Use componentBorder
            '&:focus-within': {
              borderColor: theme.colors.grape[5],
            },
          },
          label: {
            color: theme.white,
          },
        };
      },
    },
    NumberInput: {
      styles: (theme: any, _params: any, _ctx: any) => {
        return {
          input: {
            background: theme.colors.componentBg[1],
            color: theme.white,
            border: `1px solid ${theme.colors.componentBorder[0]}`, // Use componentBorder
            '&:focus-within': {
              borderColor: theme.colors.grape[5],
            },
          },
          label: {
            color: theme.white,
          },
          controls: {
            borderLeft: `1px solid ${theme.colors.componentBorder[0]}`, // Add border to separate controls
          },
          control: {
            color: theme.white,
            border: 'none',
            background: theme.colors.componentBg[1],
            '&:hover': {
              background: theme.colors.componentBg[2],
            },
          },
        };
      },
    },
    Textarea: {
      styles: (theme: any, _params: any, _ctx: any) => {
        return {
          input: {
            background: theme.colors.componentBg[1],
            color: theme.white,
            border: `1px solid ${theme.colors.componentBorder[0]}`, // Use componentBorder
            '&:focus-within': {
              borderColor: theme.colors.grape[5],
            },
          },
          label: {
            color: theme.white,
          },
        };
      },
    },
    Select: {
      styles: (theme: any, _params: any, _ctx: any) => {
        return {
          input: {
            background: theme.colors.componentBg[1],
            color: theme.white,
            border: `1px solid ${theme.colors.componentBorder[0]}`, // Use componentBorder
            '&:focus-within': {
              borderColor: theme.colors.grape[5],
            },
          },
          label: {
            color: theme.white,
          },
          item: {
            color: theme.black, // Default item color for light background
            '&[data-selected]': {
              backgroundColor: theme.colors.grape[1],
              color: theme.black,
            },
            '&[data-hovered]': {
              backgroundColor: theme.colors.grape[0],
              color: theme.black,
            },
          },
          dropdown: {
            background: theme.white,
            border: `1px solid ${theme.colors.componentBorder[0]}`, // Use componentBorder
          },
        };
      },
    },
    Progress: {
      styles: (theme: any, _params: any, _ctx: any) => {
        return {
          section: {
            backgroundSize: '200% 100%',
            backgroundImage: `linear-gradient(to right, ${theme.colors.grape[5]} 0%, ${theme.colors.grape[5]} 40%, ${theme.colors.cyan[5]} 50%, ${theme.colors.grape[5]} 60%, ${theme.colors.grape[5]} 100%)`,
            animation: 'gradientAnimation 3s ease infinite',
          },
        };
      },
    },
    MultiSelect: {
      styles: (theme: any, _params: any, _ctx: any) => {
        return {
          input: {
            background: theme.colors.componentBg[1],
            color: theme.white,
            border: `1px solid ${theme.colors.componentBorder[0]}`, // Use componentBorder
            '&:focus-within': {
              borderColor: theme.colors.grape[5],
            },
          },
          label: {
            color: theme.white,
          },
          pills: {
            background: theme.colors.grape[6],
            color: theme.white,
          },
          dropdown: {
            background: theme.white,
            border: `1px solid ${theme.colors.componentBorder[0]}`, // Use componentBorder
          },
          item: {
            color: theme.black, // Default item color for light background
            '&[data-selected]': {
              backgroundColor: theme.colors.grape[1],
              color: theme.black,
            },
            '&[data-hovered]': {
              backgroundColor: theme.colors.grape[0],
              color: theme.black,
            },
          },
        };
      },
    },
    Button: {
      styles: (theme: any, _params: any, _ctx: any) => {
        return {
          root: {
            fontWeight: 600,
            color: theme.white,
            background: theme.colors.grape[6],
            '&:hover': {
              background: theme.colors.grape[7],
            },
            '&[data-variant="outline"]': {
              backgroundColor: 'transparent',
              borderColor: theme.colors.grape[6],
              color: theme.colors.grape[6],
              '&:hover': {
                backgroundColor: theme.colors.grape[0],
                color: theme.colors.grape[7],
              },
            },
          },
        };
      },
    },
    Text: {
      styles: (theme: any, _params: any, _ctx: any) => ({
        root: {
          color: theme.white,
        },
      }),
    },
    Title: {
      styles: (theme: any, _params: any, _ctx: any) => ({
        root: {
          color: theme.white,
        },
      }),
    },
    Group: {
      styles: (theme: any, _params: any, _ctx: any) => ({
        root: {
          color: theme.white,
        },
      }),
    },
    Box: {
      styles: (theme: any, _params: any, _ctx: any) => ({
        root: {
          color: theme.white,
        },
      }),
    },
    Stack: {
      styles: (theme: any, _params: any, _ctx: any) => ({
        root: {
          color: theme.white,
        },
      }),
    },
    Accordion: {
      styles: (theme: any, _params: any, _ctx: any) => {
        return {
          item: {
            background: theme.colors.componentBg[0],
            color: theme.white,
            border: `1px solid ${theme.colors.componentBorder[0]}`, // Use componentBorder
            borderRadius: theme.defaultRadius,
            overflow: 'hidden',
          },
          control: {
            padding: theme.spacing.md,
          },
          panel: {
            padding: theme.spacing.md,
            paddingTop: 0,
          },
        };
      },
    },
    Stepper: {
      styles: (theme: any, _params: any, _ctx: any) => ({
        root: {
          background: 'transparent',
        },
        stepIcon: {
          background: theme.colors.darkBg[1],
          color: theme.white,
          border: `2px solid ${theme.colors.grape[5]}`, // Use grape color for border
        },
        step: {
          color: theme.white,
        },
        stepLabel: {
          color: theme.white,
        },
        separator: {
          borderColor: theme.colors.grape[5],
        },
      }),
    },
  },
  other: {
    bgAnim: 'bg-animate 20s linear infinite',
  },
});
