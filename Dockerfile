# Build-Stage fur das Angular-Frontend
FROM node:20 as frontend-build
WORKDIR /app/frontend
COPY beamVR-frontend/package*.json ./
RUN npm install
COPY beamVR-frontend/ .
RUN npm run build -- --base-href /e.plakolb/

# Build-Stage fur das Node.js-Backend
FROM node:20 as backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ .

# Endgultiges Image
FROM nginx:alpine
RUN apk add --update nodejs npm

# Backend
COPY --from=backend-build /app/backend /usr/share/nginx/backend

# Frontend
COPY --from=frontend-build /app/frontend/dist/beam-vr-frontend/browser /usr/share/nginx/html

# Nginx-Konfiguration
COPY nginx.conf /etc/nginx/nginx.conf

# Starten von Nginx und Node.js
CMD ["sh", "-c", "nginx; node /usr/share/nginx/backend/app.js"]

