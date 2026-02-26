export function withAuth(
  handler: (req: Request) => Promise<Response> | Response,
) {
  return async (req: Request) => {
    const authHeader = req.headers.get("Authorization");

    // Check if the header exists and starts with our fake "token_"
    if (!authHeader || !authHeader.startsWith("Bearer token_")) {
      return Response.json(
        { error: "Unauthorized: Please log in first." },
        { status: 401 },
      );
    }

    return handler(req);
  };
}
