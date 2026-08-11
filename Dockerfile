# 1. Build Stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm install

COPY . .

# Generar el cliente en ./generated/prisma y compilar el proyecto NestJS
RUN npx prisma generate
RUN npm run build

# 2. Production Stage
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

# Copiamos los archivos compilados de NestJS, la carpeta de prisma y los tipos generados
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
#COPY --from=builder /usr/src/app/generated ./generated
COPY --from=builder /usr/src/app/src/generated ./src/generated

# Generamos nuevamente las librerías binarias de Prisma según el SO del contenedor runner
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/main.js"]