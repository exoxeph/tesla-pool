FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm install

FROM deps AS build
COPY apps/web apps/web
RUN npm run build --workspace apps/web

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /repo/apps/web/.next ./apps/web/.next
COPY --from=build /repo/apps/web/public ./apps/web/public
COPY --from=build /repo/apps/web/package.json ./apps/web/package.json
COPY --from=build /repo/apps/web/next.config.js ./apps/web/next.config.js

WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
