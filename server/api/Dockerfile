FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json server.js learn.js backup.js ./
RUN mkdir -p /data/backups && chown -R node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
