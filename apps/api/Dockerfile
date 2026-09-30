FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /repo

FROM base AS deps
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install

FROM deps AS build
COPY apps/api apps/api
RUN npm run prisma:generate --workspace apps/api
RUN npm run build --workspace apps/api

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json

WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["node", "dist/server.js"]
