# Estágios: build (Vite) → imagem final (Nginx servindo o build e encaminhando /api para a API).
# O contexto é a raiz do repositório, porque o web depende de ../front-shared:
#   docker build -f web/Dockerfile .
FROM node:24.21.0-alpine3.24 AS build

WORKDIR /src/web

COPY front-shared /src/front-shared
COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web .
# sem VITE_API_URL: o front chama /api no próprio domínio e o Nginx repassa para a API
RUN npm run build

FROM nginx:1.31.6-alpine3.24

# o entrypoint do Nginx troca ${API_UPSTREAM} no template e grava em /etc/nginx/conf.d/default.conf
COPY web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /src/web/dist /usr/share/nginx/html

# API rodando no host do Docker (compose.prod.yaml liga host.docker.internal ao host)
ENV API_UPSTREAM=http://host.docker.internal:8080

EXPOSE 80
