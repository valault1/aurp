// Palettes: https://coolors.co/palettes/trending

import { createTheme, PaletteOptions } from "@mui/material";

export declare interface Theme {
  colors?: {
    primary?: string;
    primaryVariant?: string;
    secondary?: string;
    secondaryVariant?: string;
    contentTertiary?: string;
    accent?: string;
    error?: string;
    textPrimary?: string;
    background?: string;
  };
}

declare module "@mui/material/styles" {
  interface Theme {
    palette: PaletteOptions;
    status: {
      danger: string;
    };
  }
  // allow configuration using `createTheme`
  interface ThemeOptions {
    palette?: PaletteOptions;
    status?: {
      danger?: string;
    };
  }
}
let myGray = "#979dac";
let primary = "#F08080";
let secondary = "#FFD6A5";
let textPrimary = "#00001D";
let background = "#F5F5FD";

// Default theme object: https://mui.com/customization/default-theme/
// My colors: https://coolors.co/palette/ffd6ff-e7c6ff-c8b6ff-b8c0ff-bbd0ff
export const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: primary,
    },
    secondary: {
      main: secondary,
    },
  },
});

export const theme: Theme = {
  colors: {
    primary: primary,
    primaryVariant: "#FFFFFF",
    secondary: secondary,
    secondaryVariant: "#e7c6ff",
    accent: "#ffd6ff",
    textPrimary: textPrimary,
    contentTertiary: myGray,
    error: "#9a031e",
    background: background,
  },
};
