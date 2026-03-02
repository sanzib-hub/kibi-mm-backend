import { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";

export function setupSwagger(app: Express) {
  // IMPORTANT: Trust proxy for ALB
  app.set('trust proxy', 1);

  // Get server URL from environment or default to localhost
  const serverUrl = process.env.SWAGGER_SERVER_URL || "http://localhost:4000";

  // Support multiple servers for different environments
  const servers = [
    { url: serverUrl, description: "Current Environment" }
  ];

  // Add localhost for development
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "local") {
    servers.push({
      url: "http://localhost:4000",
      description: "Local Development"
    });
  }

  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "OnBoarding API",
        version: "1.0.0",
        description: "Swagger docs for OnBoarding microservice",
      },
      servers: servers,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    // Use both compiled JS and source TS files
    apis: [
      path.join(process.cwd(), "src/routers/*.ts"),
      path.join(process.cwd(), "dist/routers/*.js")
    ],
  };

  const specs = swaggerJsdoc(options);

  // Swagger UI setup - NO custom middleware needed
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: "OnBoarding API Docs"
    })
  );

  // JSON endpoint for the spec
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });

  console.log(`✅ Swagger initialized at ${serverUrl}/api-docs`); // Fixed: parentheses instead of backticks
}