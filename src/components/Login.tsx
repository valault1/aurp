import { useState } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Card,
  Typography,
  Alert,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";

interface LoginProps {}

export function Login({}: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const endpoint = isLogin ? "/api/login" : "/api/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      login(data.token);
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <Card sx={{ p: 4, width: "100%" }}>
          <Typography variant="h4" sx={{ mb: 3 }}>
            {isLogin ? "Login" : "Create Account"}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />

            <Button fullWidth variant="contained" type="submit" sx={{ mt: 3 }}>
              {isLogin ? "Login" : "Register"}
            </Button>
          </form>

          <Button
            fullWidth
            variant="text"
            sx={{ mt: 2 }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Need an account? Register" : "Have an account? Login"}
          </Button>
        </Card>
      </Box>
    </Container>
  );
}
