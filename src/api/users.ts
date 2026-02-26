import { db } from "../db/schema";

export function getAllUsers() {
  const users = db.query("SELECT username FROM users").all() as {
    username: string;
  }[];
  return Response.json({
    users: users.map((u) => ({ username: u.username })),
  });
}
