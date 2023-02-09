const { Command } = require("commander");
const https = require("https");
const chalk = require("chalk");
const fs = require("fs-extra");
const packageJson = require("../package.json");
const envinfo = require("envinfo");
const execSync = require("child_process").execSync;
const path = require("path");
const program = new Command();
const semver = require("semver");
const validateProjectName = require("validate-npm-package-name");
// const spawn = require("cross-spawn");
const ora = require("ora");
const os = require("os");

let projectName;
function init() {
  program
    .name(packageJson.name)
    .description("cli to create-react-app")
    .version(packageJson.version)
    .option("--verbose", "print additional logs")
    .option("--info", "print environment debug info")
    .arguments("<project-directory>")
    .action((name) => {
      projectName = name;
    })
    .parse(process.argv);

  if (!projectName) {
    console.error("Please specify the project directory:");
    console.log(
      `  ${chalk.cyan(program.name())} ${chalk.green("<project-directory>")}`
    );
    console.log(
      `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
    );
    process.exit(1);
  }
  if (program.info) {
    console.log(chalk.bold("\nEnvironment Info:"));
    console.log(
      `\n  current version of ${packageJson.name}: ${packageJson.version}`
    );
    console.log(`  running from ${__dirname}`);
    return envinfo
      .run(
        {
          System: ["OS", "CPU"],
          Binaries: ["Node", "npm", "Yarn"],
          Browsers: [
            "Chrome",
            "Edge",
            "Internet Explorer",
            "Firefox",
            "Safari",
          ],
          npmPackages: ["react", "react-dom", "react-scripts"],
          npmGlobalPackages: ["create-react-app"],
        },
        {
          json: true,
          showNotFound: true,
        }
      )
      .then(console.log);
  }

  checkForLatestVersion()
    .catch(() => {
      try {
        return execSync("npm view create-react-app version").toString().trim();
      } catch (e) {
        return null;
      }
    })
    .then((latest) => {
      if (latest && semver.lt(packageJson.version, latest)) {
        console.log();
        console.error(
          chalk.yellow(
            `You are running \`create-react-app\` ${packageJson.version}, which is behind the latest release (${latest}).\n\n` +
              "We recommend always using the latest version of create-react-app if possible."
          )
        );
        console.log();
        console.log(
          "The latest instructions for creating a new app can be found here:\n" +
            "https://create-react-app.dev/docs/getting-started/"
        );
        console.log();
      } else {
        createApp(
          projectName,
          program.verbose,
          program.scriptsVersion,
          program.template,
          program.usePnp
        );
      }
    });
}

function createApp(name, verbose, scriptsVersion, template, usePnp) {
  const unsupportedNodeVersion = !semver.satisfies(
    semver.coerce(process.version),
    ">=14"
  );
  if (unsupportedNodeVersion) {
    console.log(
      chalk.yellow(
        `You are using Node ${process.version} so the project will be bootstrapped with an old unsupported version of tools.\n\n` +
          `Please update to Node 14 or higher for a better, fully supported experience.\n`
      )
    );
    version = "react-scripts@0.9.x";
  }
  const root = path.resolve(name);
  const appName = path.basename(root);
  checkAppName(appName);
  // 空文件
  fs.emptyDirSync(name);
  if (!isSafeToCreateProjectIn(root, name)) {
    process.exit(1);
  }
  console.log(`Creating a new React app in ${chalk.green(root)}.`);
  console.log();
  const packageJson = {
    name: appName,
    version: "0.1.0",
    private: true,
  };
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(packageJson, null, 2) + os.EOL
  );
  const originalDirectory = process.cwd();
  //   console.log(os.EOL, JSON.stringify(packageJson, null, 2) + os.EOL);
  process.chdir(root);

  //   run(
  //     root,
  //     appName,
  //     version,
  //     verbose,
  //     originalDirectory,
  //     template,
  //     useYarn,
  //     usePnp
  //   );
}

function isSafeToCreateProjectIn(root, name) {
  const validFiles = [
    ".DS_Store",
    ".git",
    ".gitattributes",
    ".gitignore",
    ".gitlab-ci.yml",
    ".hg",
    ".hgcheck",
    ".hgignore",
    ".idea",
    ".npmignore",
    ".travis.yml",
    "docs",
    "LICENSE",
    "README.md",
    "mkdocs.yml",
    "Thumbs.db",
  ];
  const errorLogFilePatterns = [
    "npm-debug.log",
    "yarn-error.log",
    "yarn-debug.log",
  ];

  const isErrorLog = (file) => {
    return errorLogFilePatterns.some((pattern) => file.startsWith(pattern));
  };

  const conflicts = fs
    .readdirSync(root)
    .filter((file) => !validFiles.includes(file))
    .filter((file) => !/\.iml$/.test(file))
    .filter((file) => !isErrorLog(file));
  if (conflicts.length > 0) {
    console.log(
      `The directory ${chalk.green(name)} contains files that could conflict:`
    );
    console.log();
    for (const file of conflicts) {
      try {
        const stats = fs.lstatSync(path.join(root, file));
        if (stats.isDirectory()) {
          console.log(`  ${chalk.blue(`${file}/`)}`);
        } else {
          console.log(`  ${file}`);
        }
      } catch (error) {
        console.log(`  ${file}`);
      }
    }
    console.log();
    console.log(
      "Either try using a new directory name, or remove the files listed above."
    );

    return false;
  }
  fs.readdirSync(root).forEach((file) => {
    if (isErrorLog(file)) {
      fs.removeSync(path.join(root, file));
    }
  });
  return true;
}

function checkAppName(appName) {
  const validationResult = validateProjectName(appName);
  if (!validationResult.validForNewPackages) {
    console.error(
      chalk.red(
        `Cannot create a project named ${chalk.green(
          `"${appName}"`
        )} because of npm naming restrictions:\n`
      )
    );
    [
      ...(validationResult.errors || []),
      ...(validationResult.warnings || []),
    ].forEach((error) => {
      console.error(chalk.red(`  * ${error}`));
    });
    console.error(chalk.red("\nPlease choose a different project name."));
    process.exit(1);
  }
  const dependencies = ["react", "react-dom", "react-scripts"];
  if (dependencies.includes(appName)) {
    console.error(
      chalk.red(
        `Cannot create a project named ${chalk.green(
          `"${appName}"`
        )} because a dependency with the same name exists.\n` +
          `Due to the way npm works, the following names are not allowed:\n\n`
      ) +
        chalk.cyan(dependencies.map((depName) => `  ${depName}`).join("\n")) +
        chalk.red("\n\nPlease choose a different project name.")
    );
    process.exit(1);
  }
}

function checkForLatestVersion() {
  const spinner = ora("is fetch dist-tags");
  spinner.start();
  return new Promise((resolve, rej) => {
    https
      .get(
        "https://registry.npmjs.org/-/package/create-react-app/dist-tags",
        (res) => {
          if (res.statusCode === 200) {
            spinner.succeed();
            let body = "";
            res.on("data", (data) => (body += data));
            res.on("end", () => {
              resolve(JSON.parse(body).latest);
            });
          } else {
            rej();
          }
        }
      )
      .on("error", () => {
        rej();
        spinner.fail("Request failed,refetch...");
      });
  });
}

module.exports = { init };
