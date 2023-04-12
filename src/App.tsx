import { Alert, Snackbar, ThemeProvider } from "@mui/material";
import * as React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import NavBar from "./NavBar";
import { AppRoutes } from "./AppRoutes";
import { muiTheme, theme } from "./components/theme/theme";
import { UserContext } from "shared/UserContext";
import { useLogin } from "shared/hooks/useLogin";
import { ToastProvider, ToastProps } from "react-toast-notifications";

// This is the component shown for all toasts.
// Doing it like this allows us to pass in "appearance" in addToast
const AlertAsToast: React.FC<ToastProps> = (props) => (
  <Alert severity={props.appearance}>{props.children}</Alert>
);
export default function App() {
  const { user, loginFunction, logOutFunction } = useLogin();
  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.textPrimary,
      }}
    >
      <UserContext.Provider value={{ user, loginFunction, logOutFunction }}>
        <ThemeProvider theme={muiTheme}>
          <ToastProvider
            placement={"top-center"}
            autoDismiss
            components={{ Toast: AlertAsToast }}
          >
            <Router>
              <NavBar />
              <AppRoutes />
            </Router>
          </ToastProvider>
        </ThemeProvider>
      </UserContext.Provider>
    </div>
  );
}
