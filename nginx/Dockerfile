# ==============================================================================
# ARCHIVO: nginx/Dockerfile
# FUNCIONALIDAD: Nginx optimizado con módulos adicionales
# ==============================================================================

FROM nginx:alpine

# Install additional modules if needed
# RUN apk add --no-cache nginx-mod-http-brotli

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create cache directories
RUN mkdir -p /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
