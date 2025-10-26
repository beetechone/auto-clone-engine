FROM node:20-alpine
WORKDIR /app
COPY package.json /app/
RUN npm install
COPY . /app
RUN npm run build
EXPOSE 3000
ENV NEXT_PUBLIC_API_BASE=http://api:8000
CMD ["npm", "start"]
