ARG NODE_IMAGE=node:26-bookworm
FROM ${NODE_IMAGE} AS build
RUN groupadd -g 1500 hackmd && useradd -m -u 1500 -g 1500 hackmd
USER hackmd
WORKDIR /home/hackmd/app
ARG CODIMD_DEBUG_BUNDLE=0
ARG TARGETARCH
ENV CODIMD_DEBUG_BUNDLE=$CODIMD_DEBUG_BUNDLE

COPY --chown=hackmd:hackmd . .
ENV QT_QPA_PLATFORM=offscreen

RUN set -xe && \
    npm ci --ignore-scripts && \
    mkdir -p node_modules/@hackmd/pandoc.js/.pandoc-local && \
    curl -fL --retry 3 "https://github.com/jgm/pandoc/releases/download/3.1.11/pandoc-3.1.11-linux-${TARGETARCH}.tar.gz" -o /tmp/pandoc.tar.gz && \
    tar -xzf /tmp/pandoc.tar.gz -C /tmp && \
    cp /tmp/pandoc-3.1.11/bin/pandoc node_modules/@hackmd/pandoc.js/.pandoc-local/pandoc && \
    rm -rf /tmp/pandoc.tar.gz /tmp/pandoc-3.1.11 && \
    npm run build && \
    cp ./deployments/docker-entrypoint.sh ./ && \
    cp .sequelizerc.example .sequelizerc && \
    rm -rf .git .gitignore .travis.yml .dockerignore .editorconfig .babelrc .mailmap .sequelizerc.example \
        test docs contribute \
        package-lock.json webpack.prod.js webpack.htmlexport.js webpack.dev.js webpack.common.js \
        config.json.example README.md CONTRIBUTING.md AUTHORS

FROM ${NODE_IMAGE} AS runtime
RUN groupadd -g 1500 hackmd && useradd -m -u 1500 -g 1500 hackmd && \
    apt-get update && apt-get install -y --no-install-recommends imagemagick && \
    rm -rf /var/lib/apt/lists/*
USER hackmd
ENV QT_QPA_PLATFORM=offscreen
WORKDIR /home/hackmd/app
COPY --chown=1500:1500 --from=build /home/hackmd/app .
RUN npm prune --omit=dev --ignore-scripts && npm cache clean --force && rm -rf /tmp/{core-js-banners,phantomjs}
EXPOSE 3000
ENTRYPOINT ["/home/hackmd/app/docker-entrypoint.sh"]
