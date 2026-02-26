import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Box,
  Alert,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";

export function WeatherDisplay() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/weather", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch weather");

        const result = await response.json();
        console.log("Weather data:", result);
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [token]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
      </Box>
    );

  if (error) return <Alert severity="error">{error}</Alert>;

  const current = data.current_weather;
  const daily = data.daily;

  return (
    <Card
      sx={{ mt: 3, maxWidth: 450, mx: "auto", borderRadius: 4, boxShadow: 3 }}
    >
      <CardContent>
        <Typography variant="h2" sx={{ fontWeight: "bold", mb: 0 }}>
          {Math.round(current.temperature)}°F
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Wind: {current.windspeed} mph
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
          7-Day Forecast
        </Typography>
        <List dense>
          {daily.time.map((date: string, index: number) => (
            <ListItem key={date} sx={{ px: 0 }}>
              <ListItemText
                primary={new Date(date + "T00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                })}
                sx={{ flex: 1 }}
              />
              <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                {Math.round(daily.temperature_2m_max[index])}°
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ ml: 2, minWidth: 30, textAlign: "right" }}
              >
                {Math.round(daily.temperature_2m_min[index])}°
              </Typography>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
