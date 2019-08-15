#!/usr/bin/env node
import HttpsProxyAgent from 'https-proxy-agent';
import HttpProxyAgent from 'http-proxy-agent';
import superagent from 'superagent';

import args from './args';
import commands from './commands';
import log from './logger';

// Load cli params
const params = args.argv;

log.debug('Starting Auth0 Deploy CLI Tool');

// Set log level
log.transports.console.level = params.level;
if (params.debug) {
  log.transports.console.level = 'debug';
  // Set for auth0-source-control-ext-tools
  process.env.AUTH0_DEBUG = 'true';
}

async function run() {
  // Run command
  const cmd = commands[params._[0]];

  // TODO: Prob a native/better way to enforce command choices in yargs.
  if (!cmd) {
    log.error(`Command ${params._[0]} not supported\n`);
    args.showHelp();
    process.exit(1);
  }

  // Monkey Patch the superagent for proxy use
  if(params.proxy_url) {
    configureProxy(params.proxy_url);
  }

  log.debug(`Start command ${params._[0]}`);
  await cmd(params);
  log.debug(`Finished command ${params._[0]}`);
}

// Only run if from command line
if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((error) => {
      if (error.type || error.stage) {
        log.error(`Problem running command ${params._[0]} during stage ${error.stage} when processing type ${error.type}`);
      } else {
        log.error(`Problem running command ${params._[0]}`);
      }

      const msg = error.message || error.toString();
      log.error(msg);

      if (process.env.AUTH0_DEBUG === 'true') {
        log.debug(error.stack);
      }

      if (typeof msg === 'string' && msg.includes('Payload validation error')) {
        log.info('Please see https://github.com/auth0/auth0-deploy-cli#troubleshooting for common issues');
      }
      process.exit(1);
    });
}

// Allow the proxy to be configured when initialing tasks through code 
function configureProxy(proxy_url) {
  const proxyAgent = new _httpProxyAgent2.default(proxy_url);
  const proxyAgentSsl = new _httpsProxyAgent2.default(proxy_url);
  const OrigRequest = _superagent2.default.Request;
  _superagent2.default.Request = function RequestWithAgent(method, url) {
    const req = new OrigRequest(method, url);
    _logger2.default.info(`Setting proxy for ${method} to ${url}`);
    if (url.startsWith('https')) return req.agent(proxyAgentSsl);
    return req.agent(proxyAgent);
  };
 }


// Export commands to be used programmatically
module.exports = {
  deploy: commands.import,
  dump: commands.export,
  import: commands.import,
  export: commands.export,
  configureProxy: configureProxy
};

