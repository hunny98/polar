import path from "path";

import type { NetworkConfig, ResolvedConfig, RuntimeArgs } from "../../../types";
import { PolarContext } from "../../context";
import { loadPluginFile } from "../plugins";
import { getUserConfigPath } from "../project-structure";
import { resolveConfig } from "./config-resolution";
// import { validateConfig } from "./config-validation";

function importCsjOrEsModule (filePath: string): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  const imported = require(filePath); // eslint-disable-line @typescript-eslint/no-var-requires
  return imported.default !== undefined ? imported.default : imported;
}

export async function loadConfigAndTasks (
  runtimeArgs?: Partial<RuntimeArgs>
): Promise<ResolvedConfig> {
  let configPath =
    runtimeArgs !== undefined ? runtimeArgs.config : undefined;

  if (configPath === undefined) {
    configPath = getUserConfigPath();
  } else {
    if (!path.isAbsolute(configPath)) {
      configPath = path.join(process.cwd(), configPath);
      configPath = path.normalize(configPath);
    }
  }

  // Before loading the builtin tasks, the default and user's config we expose
  // the config env in the global object.
  const configEnv = require("./config-env"); // eslint-disable-line @typescript-eslint/no-var-requires

  const globalAsAny = global as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  Object.entries(configEnv).forEach(
    ([key, value]) => (globalAsAny[key] = value)
  );

  loadPluginFile(path.join(__dirname, "..", "tasks", "builtin-tasks"));
  const defaultConfig = importCsjOrEsModule("./default-config");
  const userConfig = configPath !== undefined ? importCsjOrEsModule(configPath) : defaultConfig;
  // validateConfig(userConfig);

  // To avoid bad practices we remove the previously exported stuff
  Object.keys(configEnv).forEach((key) => (globalAsAny[key] = undefined));

  return resolveConfig(
    configPath,
    defaultConfig,
    userConfig,
    PolarContext.getPolarContext().configExtenders
  );
}
