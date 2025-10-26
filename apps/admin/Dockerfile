FROM node:20-alpine
WORKDIR /app
COPY . /app
RUN npm init -y >/dev/null 2>&1 || true
EXPOSE 3000
CMD ["node", "-e", "require('http').createServer((_,r)=>r.end('admin placeholder')).listen(3000)"]
