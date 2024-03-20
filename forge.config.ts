import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import MakerDMG from "@electron-forge/maker-dmg";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import MakerZIP from "@electron-forge/maker-zip";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";
import { mainConfig } from "./webpack.main.config";

import { rendererConfig } from "./webpack.renderer.config";
import { join } from "path";

const icon_path = join(__dirname, "src", "assets", "icon");

const config: ForgeConfig = {
  packagerConfig: {
    asar: false,
    icon: icon_path,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel(
      {
        iconUrl:
          "https://raw.githubusercontent.com/SalmanFarooqShiekh/wild-ex/main/src/assets/icon.ico",
        setupIcon: icon_path + ".ico",
        skipUpdateIcon: true,
      },
      ["win32"],
    ),
    new MakerDMG({ name: "WildEx", icon: icon_path + ".icns", overwrite: true }),
    // new MakerZIP({}),
  ],
  plugins: [
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: "./src/index.html",
            js: "./src/renderer.ts",
            name: "main_window",
            preload: {
              js: "./src/preload.ts",
            },
          },
        ],
      },
    }),
  ],
};

export default config;
