import { userQueries } from "@/db/models/User";

export async function registerUser(req: Request) {
  const { username, password } = await req.json();

  if (!password || password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  const hashedPassword = await Bun.password.hash(password);

  try {
    userQueries.insertUser.run({ $user: username, $pass: hashedPassword });

    return Response.json({ success: true, token: `token_${username}` });
  } catch (e) {
    return Response.json({ error: "User already exists" }, { status: 400 });
  }
}

export async function loginUser(req: Request) {
  const { username, password } = await req.json();

  const user = userQueries.getUserByUsername.get({ $user: username }) as any;

  if (!user) return Response.json({ error: "Invalid login" }, { status: 401 });

  const isMatch = await Bun.password.verify(password, user.password);

  if (isMatch) {
    return Response.json({ success: true, token: `token_${username}` });
  }

  return Response.json({ error: "Invalid login" }, { status: 401 });
}
