// PM2 config for non-Docker host deploys. Each app runs from its own folder so
// it resolves its own node_modules. (Docker uses the per-app Dockerfiles instead.)
module.exports = {
  apps: [
    {
      name: 'employee-be',
      cwd: './backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'employee-fe',
      cwd: './frontend',
      script: './node_modules/vite/bin/vite.js',
      args: 'preview --host 0.0.0.0',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
