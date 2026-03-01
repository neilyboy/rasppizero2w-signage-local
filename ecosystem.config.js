const path = require('path');

module.exports = {
  apps: [
    {
      name: 'pisign',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        DISPLAY: ':0',
        XAUTHORITY: path.join(process.env.HOME || '/home/neil', '.Xauthority'),
      },
    },
  ],
};
