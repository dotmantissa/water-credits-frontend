# ---- Stage 1: build ----
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The real environment.ts is gitignored; fall back to the example so the
# build has something to compile against. Override values at runtime via
# your deployment platform's env-substitution step if needed, or pass
# --build-arg-backed values here in a future iteration.
RUN [ -f src/environments/environment.ts ] || cp src/environments/environment.ts.example src/environments/environment.ts

RUN npm run build -- --configuration production

# ---- Stage 2: production ----
FROM nginx:1.27-alpine AS production

# Angular's application builder (Angular 17+) nests output under /browser
COPY --from=build /app/dist/water-credits-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]