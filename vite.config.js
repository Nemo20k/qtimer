import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves this project under /qtimer/ rather than /.
  base: "/",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        privacy: "privacy/index.html",
        contact: "contact/index.html",
        hiitTimer: "hiit-timer/index.html",
        tabataTimer: "tabata-timer/index.html",
        emomTimer: "emom-timer/index.html",
      },
    },
  },
});
