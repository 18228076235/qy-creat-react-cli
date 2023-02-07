const { Command } = require('commander');
const https=require('https')
const chalk = require('chalk');
const fs=require('fs-extra');
const packageJson=require('../package.json')
const envinfo = require('envinfo')
const execSync=require('child_process').execSync
const program = new Command();
const  semver = require('       semver')

let projectName;
function init(){
    program.name(packageJson.name)
    .description('cli to create-react-app')
    .version(packageJson.version)
    .option('--verbose', 'print additional logs')
    .option('--info','print environment debug info')
    .arguments('<project-directory>')
    .action(name => {
        projectName = name;
      })
    .parse(process.argv)

    if(!projectName){
        console.error('Please specify the project directory:');
        console.log(
          `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}`
        );
        console.log(
            `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
          );
          process.exit(1);
    }
    if(program.info){
        console.log(chalk.bold('\nEnvironment Info:'));
        console.log(
            `\n  current version of ${packageJson.name}: ${packageJson.version}`
          );
          console.log(`  running from ${__dirname}`);
          return envinfo
          .run(
            {
              System: ['OS', 'CPU'],
              Binaries: ['Node', 'npm', 'Yarn'],
              Browsers: [
                'Chrome',
                'Edge',
                'Internet Explorer',
                'Firefox',
                'Safari',
              ],
              npmPackages: ['react', 'react-dom', 'react-scripts'],
              npmGlobalPackages: ['create-react-app'],
            },
            {
              json: true,
              showNotFound: true,
            }
          )
          .then(console.log);
    
    }
    checkForLatestVersion().catch(()=>{
        try {
            return execSync('npm view create-react-app version').toString().trim()
        } catch (error) {
            return null;
        }
    }).then(res=>{
        if(res&&semver){

        }
    })
}

function checkForLatestVersion(){
    return new Promise((resolve,rej)=>{
        https.get('https://registry.npmjs.org/-/package/create-react-app/dist-tags',res=>{
            if(res.statusCode===200){
                console.log(res)
                let body='';
                res.on('data',data=>body+=data)
                res.on('end',()=>{
                    resolve(JSON.parse(body).latest)
                })
           
            }else{
                rej()
            }
        }).on('error',()=>{
            rej()
        })
    })
}

module.exports={init}