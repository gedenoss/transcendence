FROM node:20

WORKDIR /app

# BACKEND BUILD
COPY package.json package-lock.json* ./
RUN npm install

# database
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# FRONTEND BUILD

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend .

RUN npm run build

# BACK TO BACKEND

WORKDIR /app

COPY . .

# create certificates for HTTPS
RUN mkdir -p certs && \
    openssl req -nodes -new -x509 \
    -keyout certs/server.key \
    -out certs/server.cert \
    -subj "/C=FR/ST=Ile-de-France/L=Paris/O=42/CN=localhost"

# expose port
EXPOSE 8000

# launch backend
CMD ["npm", "run", "dev"]


