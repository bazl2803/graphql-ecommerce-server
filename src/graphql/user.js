import { gql, AuthenticationError, UserInputError } from "apollo-server-core";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Auth from "../services/auth.service.js";
import User from "../models/user.model.js";

export const typeDef = gql`
  type User {
    id: ID!
    firstName: String
    lastName: String
    userName: String!
    displayName: String!
    birthday: Date
    phone: String
    email: String!
    password: String!
    roles: [Role!]!
  }

  enum Role {
    USER
    ADMIN
    AUX
  }

  input userInput {
    firstName: String!
    lastName: String!
    userName: String!
    displayName: String!
    birthday: Date!
    phone: String
    email: String!
    password: String!
    roles: [String!]
  }

  extend type Query {
    users: [User!]!
    user(id: ID!): User!
  }

  extend type Mutation {
    singup(user: userInput): User
    login(userName: String, email: String, password: String): Token!
    deleteUser(id: ID): User!
    updateUser(id: ID, user: userInput): User!
  }
`;

export const resolvers = {
  Query: {
    /**
     * users
     * Return all users
     * @returns User
     */
    users: async () => {
      try {
        return await User.find();
      } catch (error) {
        throw new UserInputError(error.message);
      }
    },

    /**
     * user
     * Find an user by id and return it
     * @param {*} parent
     * @param {id} args
     * @param {*} context
     * @returns User
     */
    user: async (_, { id }) => {
      try {
        return await User.findById(id);
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }
    },
  },
  Mutation: {
    /**
     * singup
     * Create an user
     * @param {*} parent
     * @param {user} args
     * @param {*} context
     * @returns User
     */
    singup: async (_, { user }) => {
      try {
        if (await User.findOne({ userName: user.userName }))
          throw new Error("User exists");
        const newUser = new User({
          firstName: user.firstName,
          lastName: user.lastName,
          userName: user.userName,
          displayName: user.displayName,
          bithday: user.birthday,
          phone: user.phone,
          email: user.email,
          password: bcrypt.hashSync(user.password, bcrypt.genSaltSync()),
          roles: user.roles,
        });
        return await newUser.save();
      } catch (error) {
        throw new UserInputError(error.message);
      }
    },

    /**
     * login
     * Return auth token
     * @param {*} parent
     * @param {username, email, password} args
     * @param {*} context
     * @returns Token
     */
    login: async (_, { userName, email, password }) => {
      if (!(userName || email))
        return new Error("Email or username is required");

      const userPayload = email ? { email } : { userName };
      const user = await User.findOne(userPayload);

      if (!bcrypt.compare(password, user.password))
        throw new AuthenticationError("User or password are wrong");

      return {
        value: jwt.sign(
          {
            userId: user.id,
            username: user.username,
            email: user.email,
            roles: user.roles,
          },
          process.env.TOKEN_SECRET,
          { expiresIn: "30 days" }
        ),
      };
    },

    /**
     * updateUser
     * Update an existent user
     * @param {*} parent
     * @param {id: ID, user: UserInput} args
     * @param {*} context
     * @returns User
     */
    updateUser: async (_, { id, user }) => {
      try {
        const user = await User.findById(id);

        if (!user) return;

        return await User.findByIdAndUpdate(id, {
          username,
          email,
          displayName,
          password: await Auth.hashPassword(password),
        });
      } catch (error) {
        throw new UserInputError(error.message);
      }
    },

    /**
     * deleteUser
     * Delete an user.
     * @param {*} parent
     * @param {id: ID} args
     * @param {*} context
     * @returns User
     */
    deleteUser: async (_, { id }) => {
      try {
        const user = await User.findById(id);

        if (!user) return;

        return await User.findByIdAndDelete(id);
      } catch (error) {
        throw new UserInputError(error.message);
      }
    },
  },
};
