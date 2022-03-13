const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const typeDefs = require("./typeDefs/index.js");
const resolvers = require("./resolvers/index.js");

async function startApolloServer() {
  dotenv.config();

  await mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("☁ Database connection is ready");
    })
    .catch((e) => {
      console.error(`🔥 Failded connection: ${e}`, process.env.MONGODB_URI);
    });

  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      const auth = req ? req.headers.authorization : null;
      if (auth) {
        const token = auth.replace("Bearer ", "");
        if (token) {
          const { user } = jwt.verify(token, process.env.TOKEN_SECRET);
          return {
            ...req,
            user,
          };
        }
      }
    },
  });

  await server.start();

  server.applyMiddleware({ app, path: "/graphql" });

  app.listen(4000, () => {
    console.log(
      `🚀 Server ready at http://localhost:4000${server.graphqlPath}`
    );
  });
}

startApolloServer().catch((error) => {
  console.error("🔥 Failed to initialize server:", error);
});
