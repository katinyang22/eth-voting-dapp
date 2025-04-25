// src/js/index.js

// pull in all your CSS
import "../css/base.css";
import "../css/layout.css";
import "../css/components.css";

// now the rest of your app
import "./init.js";
import "./registration.js";
import "./voting.js";
import "./results.js";
import "./ui.js";

import { App } from "./init.js";
App.init();
