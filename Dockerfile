FROM mcr.microsoft.com/playwright:v1.65.1-noble
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY remote ./remote
USER pwuser
EXPOSE 3000
CMD ["node", "remote/server.js"]
