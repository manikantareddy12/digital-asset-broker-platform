FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Add non-root user
RUN addgroup -S spring && adduser -S spring -G spring

# Copy jar file
COPY target/*.jar app.jar

# Set ownership
RUN chown -R spring:spring /app

USER spring

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/api/actuator/health/liveness || exit 1

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]
