# Step 1: Build the Angular app
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --prod

# Step 2: Serve the app with NGINX
FROM nginx:alpine

# Copy built app to NGINX html directory
COPY --from=builder /app/dist/coreui-free-angular-admin-template/browser /usr/share/nginx/html

# Optional: Copy custom NGINX config (if needed)
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
