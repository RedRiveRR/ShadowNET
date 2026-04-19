FROM node:18-alpine

WORKDIR /app

# Bağımlılıkları kopyala ve kur
COPY package*.json ./
RUN npm install

# Proje dosyalarını kopyala
COPY . .

# Vite'in dışarıdan erişilebilir olması için 5173 portunu aç
EXPOSE 5173

# Vite dev server'ı --host flagi ile başlat
CMD ["npm", "run", "dev", "--", "--host"]
