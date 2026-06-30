import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import BonVenster from "./components/BonVenster";
import WegenVenster from "./components/WegenVenster";
// Lokaal gebundelde fonts (offline — geen internet nodig)
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "./styles.css";
import "./styles-multiwindow.css";
import { hydrateerDuurzameOpslag } from "./utils/opslag";

const hash = window.location.hash.replace("#/", "").replace("#", "").toLowerCase();
const Component =
  hash === "bon"   ? BonVenster :
  hash === "wegen" ? WegenVenster :
                     App;

function render() {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <Component />
    </React.StrictMode>
  );
}

// Eerst duurzame opslag (schijf) naar localStorage hydrateren, dan renderen.
// Faalt dit, dan renderen we alsnog met de localStorage-cache.
hydrateerDuurzameOpslag().finally(render);
