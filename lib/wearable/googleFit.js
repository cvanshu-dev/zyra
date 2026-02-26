export async function fetchGoogleFitData(accessToken) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const response = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
       aggregateBy: [
  { dataTypeName: "com.google.step_count.delta" },
  { dataTypeName: "com.google.heart_rate.bpm" },
  { dataTypeName: "com.google.calories.expended" },
  { dataTypeName: "com.google.active_minutes" },
  { dataTypeName: "com.google.sleep.segment" }
]
,
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: weekAgo,
        endTimeMillis: now,
      }),
    }
  );

  const data = await response.json();

  return data;
}
