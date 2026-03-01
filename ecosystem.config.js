module.exports = {
  apps: [
    {
      name: 'pisign',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/home/pi/rasppizero2w-signage-local',
      env: {
        NODE_ENV: 'production',
        DISPLAY: ':0',
        XAUTHORITY: '/home/pi/.Xauthority',
      },
    },
  ],
};
