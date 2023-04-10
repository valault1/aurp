import styled from "@emotion/styled";
import { theme } from "./theme/theme";

export const MainContainer = styled.div(() => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  height: "calc(100vh - 69px)", // THIS MIGHT NOT BE SUPPORTED IF WE EVER GO LIVE WITH THIS LOL
  color: theme.colors.textPrimary,
}));
