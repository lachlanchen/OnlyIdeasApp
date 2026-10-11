FROM node:22-bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends chromium ca-certificates fonts-noto-core poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chmod=644 package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chmod=644 public-proxy.mjs browser.mjs ./
USER node
ENV HOME=/tmp
ENTRYPOINT ["/usr/bin/timeout", "--signal=TERM", "--kill-after=5", "150", "node"]
CMD ["browser.mjs"]
