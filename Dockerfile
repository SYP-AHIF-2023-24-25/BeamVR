# Build-Stage fur das Angular-Frontend
FROM node:20 as frontend-build
WORKDIR /app/frontend
COPY beamVR-frontend/package*.json ./
RUN npm install
COPY beamVR-frontend/ .
RUN npm run build

# Build-Stage fur das Node.js-Backend
FROM node:20 as backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
RUN npm rebuild sqlite3 --build-from-source
COPY backend/ .

# Endgultiges Image
FROM debian:bookworm-slim
#RUN apk add --no-cache sqlite sqlite-dev build-base gdb strace bash nodejs npm
RUN apt-get update && apt-get install -y \
    nginx \
    sqlite3 \
    libsqlite3-dev \
    build-essential \
    gdb \
    strace \
    bash \
    nodejs \
    npm \
    && apt-get clean

# Backend
COPY --from=backend-build /app/backend /usr/share/nginx/backend

# Frontend
COPY --from=frontend-build /app/frontend/dist/beam-vr-frontend/browser /usr/share/nginx/html

# Nginx-Konfiguration
COPY nginx.conf /etc/nginx/nginx.conf

# Starten von Nginx und Node.js
CMD ["sh", "-c", "nginx -g 'daemon off;' & node /usr/share/nginx/backend/app.js"]

