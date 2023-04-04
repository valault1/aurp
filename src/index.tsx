import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { theme } from "./components/theme/theme";
import { GoogleOAuthProvider } from "@react-oauth/google";
// Sets the background color
document.body.style.backgroundColor = theme.colors.background;

ReactDOM.render(
  <GoogleOAuthProvider clientId="570585081285-1rvgp5r5tr6u2ueu011etm1cksl6pe1u.apps.googleusercontent.com">
    <React.StrictMode>
      <div>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
        />
        <App />
      </div>
    </React.StrictMode>
  </GoogleOAuthProvider>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
