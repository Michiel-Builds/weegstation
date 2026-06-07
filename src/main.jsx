import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import BonVenster from "./components/BonVenster";
import WegenVenster from "./components/WegenVenster";
import "./styles.css";
import "./styles-multiwindow.css";

const hash = window.location.hash.replace("#/", "").replace("#", "").toLowerCase();
const Component =
  hash === "bon"   ? BonVenster :
  hash === "wegen" ? WegenVenster :
                     App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>
);
