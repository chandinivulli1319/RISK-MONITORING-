import httpx

def get_weather(lat, lon):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,wind_speed_10m,precipitation",
    }
    try:
        response = httpx.get(url, params=params, timeout=10)
        response.raise_for_status()
        current = response.json()["current"]
        return {
            "temperature": current["temperature_2m"],
            "wind_speed": current["wind_speed_10m"],
            "precipitation": current["precipitation"],
        }
    except Exception as e:
        print("Weather API failed, using default values:", e)
        return {"temperature": 30, "wind_speed": 10, "precipitation": 0}

# Test: runs only when you run this file directly
if __name__ == "__main__":
    print(get_weather(17.385, 78.4867))  # Hyderabad