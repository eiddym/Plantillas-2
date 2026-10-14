FROM node:22-bookworm-slim

# Dependencias necesarias para Chromium (Puppeteer), tipografías y utilidades
RUN apt-get update && \
    apt-get install --no-install-recommends -y \
      bzip2 \
      ca-certificates \
      chromium \
      curl \
      fontconfig \
      python3 \
      tini && \
    npm install -g sequelize-cli pg && \
    rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_PATH="/usr/bin/chromium"
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"
ENV NODE_OPTIONS="--openssl-legacy-provider"

WORKDIR /app

# Copiar manifiestos primero para aprovechar cache en builds posteriores
COPY package.json ./

# Instalar dependencias de aplicación dentro de la imagen
RUN npm install --no-audit --no-fund

# Copiar el resto del backend: index.js, src, public y recursos
COPY . .

# Registrar tipografías institucionales (Teko) en la caché del sistema fontconfig
RUN mkdir -p /usr/share/fonts/truetype/teko && \
    cp /app/src/lib/html_plantilla/assets/fonts/*.ttf /usr/share/fonts/truetype/teko/ 2>/dev/null || true && \
    fc-cache -f /usr/share/fonts/truetype/teko/

RUN if [ ! -f /app/src/config/config.js ] && \
       [ -f /app/src/config/config.js.sample ]; then \
      cp /app/src/config/config.js.sample /app/src/config/config.js; \
    fi && \
    if [ ! -f /app/src/config/config.json ] && \
       [ -f /app/src/config/config.json.sample ]; then \
      cp /app/src/config/config.json.sample /app/src/config/config.json; \
    fi && \
    chown -R node:node /app

EXPOSE 8000

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["node", "index.js"]
