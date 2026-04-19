FROM node:18-alpine AS builder

WORKDIR /app

# Bağımlılıkları kopyala ve kur
COPY package*.json ./
RUN npm ci

# Proje dosyalarını kopyala ve derle
COPY . .
RUN npm run build

# --- Production Stage ---
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/vite.config.ts ./
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/.env ./.env

# Vite preview sunucusu production bundle'ı servis eder
EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host"]

