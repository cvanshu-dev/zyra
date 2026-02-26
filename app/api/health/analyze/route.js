import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function safeAggregate(token, dataType, start, end) {
  try {
    const res = await fetch(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [{ dataTypeName: dataType }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: start.getTime(),
          endTimeMillis: end.getTime(),
        }),
      }
    );

    const raw = await res.text();

    if (!res.ok) {
      console.log(`❌ Aggregate error for ${dataType}:`, raw);
      return null;
    }

    const data = JSON.parse(raw);

    if (!data.bucket || data.bucket.length === 0) {
      console.log(`⚠️ No buckets for ${dataType}`);
      return null;
    }

    return data;

  } catch (err) {
    console.log(`safeAggregate crash for ${dataType}:`, err.message);
    return null;
  }
}

export async function GET(req) {
  // Extract period from query params (e.g., /api/health/analyze?period=month)
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "week";

  try {
    // =============================
    // 1️⃣ Get Wearable Token
    // =============================
    let token = await prisma.wearableToken.findFirst();

    if (!token) {
      return NextResponse.json(
        { error: "No wearable connected" },
        { status: 400 }
      );
    }

    // =============================
    // 2️⃣ Refresh Token If Expired
    // =============================
    const now = new Date();

    if (token.expiresAt && new Date(token.expiresAt) <= now) {
      const refreshRes = await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: token.refreshToken,
            grant_type: "refresh_token",
          }),
        }
      );

      const refreshData = await refreshRes.json();

      if (!refreshRes.ok) {
        return NextResponse.json(
          { error: "Token refresh failed" },
          { status: 401 }
        );
      }

      const newAccessToken = refreshData.access_token;
      const newExpiry = new Date(
        Date.now() + refreshData.expires_in * 1000
      );

      await prisma.wearableToken.update({
        where: { id: token.id },
        data: {
          accessToken: newAccessToken,
          expiresAt: newExpiry,
        },
      });

      token.accessToken = newAccessToken;
    }

    // =============================
    // 4️⃣ Detect Available Data Sources
    // =============================
    const sourcesRes = await fetch(
      "https://www.googleapis.com/fitness/v1/users/me/dataSources",
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
        },
      }
    );

    if (!sourcesRes.ok) {
      const txt = await sourcesRes.text();
      console.log("DataSources Error:", txt);
      return NextResponse.json(
        { error: "Failed to fetch data sources" },
        { status: 500 }
      );
    }

    const sourcesData = await sourcesRes.json();

    const availableTypes = new Set(
      sourcesData.dataSource?.map(ds => ds.dataType?.name)
    );

    console.log("Available Types:", [...availableTypes]);

    // =============================
    // 3️⃣ Dynamic Period Logic (FIXED FOR MONTH)
    // =============================
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    
    // Adjust start date based on the period
    if (period === "month") {
      start.setDate(start.getDate() - 29); // 30 days total
    } else {
      start.setDate(start.getDate() - 6);  // 7 days total (default)
    }

    // =============================
    // NEW: Fetch Sleep Sessions
    // =============================
    const sessionsRes = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${start.toISOString()}&endTime=${end.toISOString()}&activityType=72`,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
        },
      }
    );

    let sleepSessions = [];
    if (sessionsRes.ok) {
      const sessionsData = await sessionsRes.json();
      sleepSessions = sessionsData.session || [];
    }
    
    console.log(`Found ${sleepSessions.length} sleep sessions for ${period}`);

    // =============================
    // 4️⃣ Fetch Aggregate Data
    // =============================
    const fitRes = await fetch(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            { dataTypeName: "com.google.step_count.delta" },
            { dataTypeName: "com.google.calories.expended" },
            { dataTypeName: "com.google.active_minutes" },
            { dataTypeName: "com.google.sleep.segment" },
            { dataTypeName: "com.google.activity.segment" }, 
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: start.getTime(),
          endTimeMillis: end.getTime(),
        }),
      }
    );

    if (!fitRes.ok) {
      const errorText = await fitRes.text();
      console.error("Google Fit Error:", errorText);
      return NextResponse.json(
        { error: "Google Fit fetch failed" },
        { status: 500 }
      );
    }

    const fitData = await fitRes.json();

    // =============================
    // Fetch Additional Metrics Separately
    // =============================
    let heartRateData = await safeAggregate(token, "com.google.heart_rate.bpm", start, end);
    let bloodPressureData = await safeAggregate(token, "com.google.blood_pressure", start, end);
    let glucoseData = await safeAggregate(token, "com.google.blood_glucose", start, end);
    let spo2Data = await safeAggregate(token, "com.google.oxygen_saturation", start, end);
    let tempData = await safeAggregate(token, "com.google.body.temperature", start, end);

    // =============================
    // 5️⃣ Parse Aggregate Data
    // =============================
    let dailySteps = null;
    let dailyHeartRate = null;
    let dailyCalories = null;
    let dailyActiveMinutes = null;
    let dailySleep = null;
    let dailySystolic = null;
    let dailyDiastolic = null;
    let dailyGlucose = null;
    let dailySpO2 = null;
    let dailyTemp = null;
    let dailyRespRate = null;

    let periodSteps = [];
    let historyBreakdown = [];

    fitData.bucket?.forEach((bucket, index) => {
      let bucketSteps = null;
      let bucketHR = null;
      let bucketCalories = null;
      let bucketActiveMinutes = null;
      let bucketSleep = null; 
      let bucketBP = { systolic: null, diastolic: null };
      let bucketGlucose = null;
      let bucketSpO2 = null;
      let bucketTemp = null;

      bucket.dataset?.forEach((dataset) => {
        const points = dataset.point || [];
        if (!points.length) return;

        const streamId = (dataset.dataSourceId || "").toLowerCase();
        const type = dataset.dataSourceId?.split(":")[1];

        if (type === "com.google.step_count.delta") {
          bucketSteps = points[0]?.value?.[0]?.intVal ?? null;
          if (bucketSteps !== null) periodSteps.push(bucketSteps);
        }

        if (type === "com.google.heart_rate.bpm") {
          const values = points.map((p) => p.value?.[0]?.fpVal).filter(Boolean);
          if (values.length) {
            bucketHR = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
          }
        }

        if (type === "com.google.calories.expended") {
          bucketCalories = Math.round(points[0]?.value?.[0]?.fpVal ?? 0);
        }

        if (type === "com.google.active_minutes") {
          bucketActiveMinutes = points[0]?.value?.[0]?.intVal ?? null;
        }

        if (streamId.includes("sleep.segment") || streamId.includes("activity.segment")) {
          let totalSleepMillis = 0;
          points.forEach((p) => {
            const activityType = p.value?.[0]?.intVal;
            if ([72, 109, 110, 111, 3, 5, 6, 7].includes(activityType)) {
              totalSleepMillis += (Number(p.endTimeNanos) - Number(p.startTimeNanos)) / 1000000;
            }
          });
          if (totalSleepMillis > 0) {
            bucketSleep = parseFloat((totalSleepMillis / (1000 * 60 * 60)).toFixed(1));
          }
        }
      });

      const bStart = Number(bucket.startTimeMillis);
      const bEnd = bStart + 86400000;

      sleepSessions.forEach(session => {
        const sStart = Number(session.startTimeMillis);
        const sEnd = Number(session.endTimeMillis);
       if (sEnd > bStart && sEnd <= bEnd){
          const sessionHours = (sEnd - sStart) / (1000 * 60 * 60);
          if (sessionHours > (bucketSleep || 0)) {
            bucketSleep = parseFloat(sessionHours.toFixed(1));
          }
        }
      });

      const bucketStartTime = Number(bucket.startTimeMillis);
      let hrForBucket = bucketHR;
      
      // Heart Rate matching
      if (heartRateData?.bucket) {
        const matchingBucket = heartRateData.bucket.find(b => Number(b.startTimeMillis) === bucketStartTime);
        const vals = matchingBucket?.dataset?.[0]?.point?.map(p => p.value?.[0]?.fpVal).filter(Boolean);
        if (vals?.length) hrForBucket = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }

      // BP matching
      if (bloodPressureData?.bucket) {
        const matchingBucket = bloodPressureData.bucket.find(b => Number(b.startTimeMillis) === bucketStartTime);
        const point = matchingBucket?.dataset?.[0]?.point?.[0];
        if (point?.value?.[0]) bucketBP = { systolic: point.value[0].fpVal, diastolic: point.value[1]?.fpVal };
      }

      // Glucose matching
      if (glucoseData?.bucket) {
        const matchingBucket = glucoseData.bucket.find(b => Number(b.startTimeMillis) === bucketStartTime);
        bucketGlucose = matchingBucket?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal ?? null;
      }

      // SpO2 matching
      if (spo2Data?.bucket) {
        const matchingBucket = spo2Data.bucket.find(b => Number(b.startTimeMillis) === bucketStartTime);
        bucketSpO2 = matchingBucket?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal ?? null;
      }

      // Temp matching
      if (tempData?.bucket) {
        const matchingBucket = tempData.bucket.find(b => Number(b.startTimeMillis) === bucketStartTime);
        bucketTemp = matchingBucket?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal ?? null;
      }

      const formattedDate = new Date(bucketStartTime).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' });

      historyBreakdown.push({
        date: formattedDate,
        steps: bucketSteps,
        heart_rate_avg: hrForBucket,
        calories: bucketCalories,
        active_minutes: bucketActiveMinutes,
        sleep_hours: bucketSleep, 
        systolic_bp: bucketBP.systolic,
        diastolic_bp: bucketBP.diastolic,
        glucose: bucketGlucose,
        spo2: bucketSpO2,
        temperature: bucketTemp,
        respiratory_rate: null,
      });

      // Update the "Daily" dashboard values with the most recent bucket
      if (index === fitData.bucket.length - 1) {
        dailySteps = bucketSteps;
        dailyHeartRate = hrForBucket;
        dailyCalories = bucketCalories;
        dailyActiveMinutes = bucketActiveMinutes;
        dailySleep = bucketSleep;
        dailySystolic = bucketBP.systolic;
        dailyDiastolic = bucketBP.diastolic;
        dailyGlucose = bucketGlucose;
        dailySpO2 = bucketSpO2;
        dailyTemp = bucketTemp;
        dailyRespRate = null;
      }
    });

    // =============================
    // 6️⃣ Fetch Raw Heart Rate (Last 24h)
    // =============================
    const endTimeRaw = Date.now();
    const startTimeRaw = endTimeRaw - 86400000;
    const heartRes = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm/datasets/${startTimeRaw}000000-${endTimeRaw}000000`,
      { headers: { Authorization: `Bearer ${token.accessToken}` } }
    );

    let heartMeasurements = [];
    if (heartRes.ok) {
      const heartData = await heartRes.json();
      heartMeasurements = heartData.point?.map((p) => ({
        bpm: Math.round(p.value?.[0]?.fpVal),
        time: new Date(Number(p.endTimeNanos) / 1000000).toLocaleString("en-IN"),
      })) || [];
    }

    // =============================
    // 7️⃣ Calculate Period Average
    // =============================
    const periodAverage = periodSteps.length > 0
        ? Math.round(periodSteps.reduce((a, b) => a + b, 0) / periodSteps.length)
        : null;

    const deviation = (periodAverage && dailySteps)
        ? Math.round(((dailySteps - periodAverage) / periodAverage) * 100)
        : null;

    // =============================
    // 8️⃣ Return Response
    // =============================
    return NextResponse.json({
      daily: {
        steps: dailySteps,
        heart_rate_avg: dailyHeartRate,
        calories: dailyCalories,
        active_minutes: dailyActiveMinutes,
        sleep_segments: dailySleep,
        systolic_bp: dailySystolic,
        diastolic_bp: dailyDiastolic,
        glucose: dailyGlucose,
        spo2: dailySpO2,
        temperature: dailyTemp,
        respiratory_rate: dailyRespRate,
      },
      weekly: { // Keeping key as 'weekly' for compatibility, but holds period data
        average_steps: periodAverage,
        deviation_percent: deviation,
        breakdown: historyBreakdown,
      },
      heart_rate_history: heartMeasurements,
    });

  } catch (error) {
    console.error("Analyze Error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}