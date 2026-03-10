# FILE: ui/Dockerfile
FROM node:20-alpine AS build

WORKDIR /app

# Copy only what we know exists
COPY package.json ./

# If you DO have a lockfile later, this will still work:
# - npm will generate a package-lock.json inside the container
RUN npm install

COPY . .

# Build-time arg for Vite
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginx:alpine AS runtime

# Nginx config with /api proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static site
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
