const fs = require("fs");

const appPath = "C:/Users/tuinkabouter/Desktop/bulterS-vite/src/App.jsx";
let app = fs.readFileSync(appPath, "utf8");

if (!app.includes("import Calculator")) {
  app = app.replace(
    'import BarChart        from "./components/BarChart";',
    'import BarChart        from "./components/BarChart";\nimport Calculator      from "./components/Calculator";'
  );
  console.log("OK import");
}

if (!app.includes('"calculator"')) {
  app = app.replace(
    '    { key: "wegen",     icon: "WEGEN", label: "Wegen"      },',
    '    { key: "calculator", icon: "CALC", label: "Calculator" },\n    { key: "wegen",     icon: "WEGEN", label: "Wegen"      },'
  );
  console.log("OK nav-item");
}

if (!app.includes('pagina === "calculator"')) {
  app = app.replace(
    '{pagina === "bon" && <BonBouwer prijzen={prijzen} />}',
    '{pagina === "calculator" && <Calculator />}\n            {pagina === "bon" && <BonBouwer prijzen={prijzen} />}'
  );
  console.log("OK render");
}

if (!app.includes('calculator: "Calculator"')) {
  app = app.replace(
    'dashboard:  "Dashboard",',
    'dashboard:  "Dashboard",\n    calculator: "Calculator",'
  );
  console.log("OK titels");
}

fs.writeFileSync(appPath, app, "utf8");
console.log("Klaar!");
