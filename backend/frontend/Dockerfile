FROM node:20

WORKDIR /app

# Installe les dépendances du projet
COPY package.json package-lock.json* ./
RUN npm install

# Installe live-server globalement
RUN npm install -g live-server

# Copie le code source
COPY . .

# Build si nécessaire (TypeScript, Tailwind, etc.)
RUN npm run build

# Expose le port 8000 (au lieu de 8080)
EXPOSE 8000

CMD ["npm", "run", "dev"]
