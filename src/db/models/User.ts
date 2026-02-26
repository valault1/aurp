import { db } from "../schema";

export const userQueries = {
  insertUser: db.prepare(
    "INSERT INTO users (username, password) VALUES ($user, $pass)",
  ),
  getUserByUsername: db.prepare("SELECT * FROM users WHERE username = $user"),
  getAllUsers: db.prepare("SELECT username FROM users"),
};
