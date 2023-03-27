import styled from "@emotion/styled";
import { theme } from "./theme/theme";

export const MainContainer = styled.div(() => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  color: theme.colors.textPrimary,
  paddingTop: 12,
}));
