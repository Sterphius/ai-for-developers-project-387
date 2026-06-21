FROM node:22-alpine AS frontend
WORKDIR /web
COPY web/ .
RUN npm install && npm run build

FROM golang:1.25-alpine AS backend
RUN apk add --no-cache git
WORKDIR /src
COPY server/ .
COPY --from=frontend /web/dist ./internal/httpapi/static
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=backend /out/server /usr/local/bin/server
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/server"]
