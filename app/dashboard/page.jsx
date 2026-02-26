"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Heart,
  Flame,
  Timer,
  Moon,
} from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState(null);
  const [activeTab, setActiveTab] = useState("today");
  const [authorized, setAuthorized] = useState(false);
const [checkingAuth, setCheckingAuth] = useState(true);

  // ✅ NEW STATES FOR AI
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [showFinal, setShowFinal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [initialSummary, setInitialSummary] = useState(null);
const [initialRisk, setInitialRisk] = useState(null);
const [history, setHistory] = useState([]);
const [historyView, setHistoryView] = useState("current");



  async function analyze() {
    try {
      const res = await fetch("/api/health/analyze");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ✅ CALL AI
 async function callAI(userAnswers = null) {
  if (!data) return;

  setAiLoading(true);

  const vitals =
   activeTab === "yesterday"
  ? data.weekly?.breakdown?.[data.weekly.breakdown.length - 2]
      : activeTab === "today"
      ? data.daily
      : activeTab === "week"
      ? data.weekly
      : data.monthly || data.weekly;

  try {
    const res = await fetch("/api/health/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vitals,
        answers: userAnswers,
        period: activeTab,
        allowFollowUp: activeTab !== "today",
      }),
    });

    const result = await res.json();

    setAiResult(result);
    setShowFinal(!!result.final_assessment);

    // Freeze summary only once
    if (!userAnswers && !initialSummary) {
      setInitialSummary(result.summary);
      setInitialRisk(result.risk_level);
    }

  } catch (err) {
    console.error("AI error:", err);
  } finally {
    setAiLoading(false);
  }
}
useEffect(() => {
  async function verifyConnection() {
    try {
      const res = await fetch("/api/health/check");

      if (!res.ok) {
        window.location.href = "/api/google/login";
        return;
      }

      setAuthorized(true);
    } catch (err) {
      window.location.href = "/api/google/login";
    } finally {
      setCheckingAuth(false);
    }
  }

  verifyConnection();
}, []);

  // ✅ TRIGGER AI WHEN TAB CHANGES OR DATA LOADS
useEffect(() => {
  if (authorized) {
    analyze();
  }
}, [authorized]);

useEffect(() => {
  async function loadHistory() {
    try {
      const res = await fetch("/api/health/history");
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }

  loadHistory();
}, []);

useEffect(() => {
  if (!data) return;

  setSubmitted(false);
  setAnswers({});
  setInitialSummary(null);
  setInitialRisk(null);

  callAI();
}, [activeTab]);

if (checkingAuth) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      Verifying connection...
    </div>
  );
}

if (!authorized) {
  return null;
}
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading health data...
      </div>
    );
  }

  const metrics = [
    {
      key: "steps",
      breakdownKey: "steps",
      label: "Steps",
      icon: <Activity size={28} />,
      value: data?.daily?.steps,
    },
    {
      key: "heart_rate_avg",
      breakdownKey: "heart_rate_avg",
      label: "Heart Rate",
      icon: <Heart size={28} />,
      value:
        data?.daily?.heart_rate_latest?.bpm ??
        data?.daily?.heart_rate_avg,
    },
    {
      key: "calories",
      breakdownKey: "calories",
      label: "Calories",
      icon: <Flame size={28} />,
      value: data?.daily?.calories,
    },
    {
      key: "active_minutes",
      breakdownKey: "active_minutes",
      label: "Active Minutes",
      icon: <Timer size={28} />,
      value: data?.daily?.active_minutes,
    },
    {
      key: "sleep_segments",
      breakdownKey: "sleep_hours",
      label: "Sleep (hrs)",
      icon: <Moon size={28} />,
      value: data?.daily?.sleep_segments,
    },
    {
      key: "blood_pressure",
      breakdownKey: "systolic_bp",
      label: "BP",
      icon: <Activity size={28} />,
      value:
        data?.daily?.systolic_bp || data?.daily?.diastolic_bp
          ? `${data?.daily?.systolic_bp ?? "--"}/${data?.daily?.diastolic_bp ?? "--"}`
          : null,
    },
    {
      key: "glucose",
      breakdownKey: "glucose",
      label: "Glucose",
      icon: <Flame size={28} />,
      value: data?.daily?.glucose,
    },
    {
      key: "spo2",
      breakdownKey: "spo2",
      label: "SpO2 (%)",
      icon: <Heart size={28} />,
      value: data?.daily?.spo2,
    },
    {
      key: "temperature",
      breakdownKey: "temperature",
      label: "Temp (°C)",
      icon: <Flame size={28} />,
      value: data?.daily?.temperature,
    },
    {
      key: "respiratory_rate",
      breakdownKey: "respiratory_rate",
      label: "Resp Rate",
      icon: <Timer size={28} />,
      value: data?.daily?.respiratory_rate,
    },
  ];


async function getAI(period = "today", answerData = null) {
  if (!data) return;

  const vitals =
    period === "yesterday"
      ? data.weekly?.breakdown?.length > 1
        ? data.weekly.breakdown[data.weekly.breakdown.length - 2]
        : null
      : period === "today"
      ? data.daily
      : period === "week"
      ? data.weekly
      : data.monthly || data.weekly;

  if (!vitals) return;

  try {
    setAiLoading(true);

    const res = await fetch("/api/health/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vitals,
        period,
        answers: answerData,
        allowFollowUp: period !== "today",
      }),
    });

    const result = await res.json();

    setAiResult(result);

    if (!answerData) {
      setInitialSummary(result.summary);
      setInitialRisk(result.risk_level);
    } else {
      setSubmitted(true);
    }

    // Reload history safely
   

  } catch (err) {
    console.error("AI failed:", err);
  } finally {
    setAiLoading(false);
  }
}
async function finalizeAssessment() {
  if (!aiResult) return;

  const vitals =
    activeTab === "yesterday"
      ? data.weekly?.breakdown?.[data.weekly.breakdown.length - 2]
      : activeTab === "today"
      ? data.daily
      : activeTab === "week"
      ? data.weekly
      : data.monthly || data.weekly;

  await fetch("/api/health/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      period: activeTab,
      vitalsSnapshot: vitals,
      initialSummary,
      initialRisk,
      followUpQuestions: aiResult.follow_up_questions,
      followUpAnswers: answers,
      finalAssessment: aiResult.final_assessment,
      finalRisk: aiResult.risk_level,
    }),
  });

  // reload history AFTER save
  const res = await fetch("/api/health/history");
  const updated = await res.json();
  setHistory(updated);
}







  return (
    <div className="min-h-screen bg-white p-10 text-black">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

        {/* ================= LEFT SIDE ================= */}
        <div className="border border-black rounded-xl p-8">
          <h2 className="text-lg font-semibold mb-8">
            Today Snapshot
          </h2>

          <div className="grid grid-cols-2 gap-8">
            {metrics.map((m) => (
              <div
                key={m.key}
                onClick={() => {
                  setActiveMetric(m);
                  setActiveTab("today");
                }}
                className="cursor-pointer border border-black/20 rounded-lg p-6 flex flex-col items-center hover:bg-black hover:text-white transition"
              >
                {m.icon}
                <div className="text-3xl font-bold mt-3">
                  {m.value ?? "--"}
                </div>
                <div className="text-xs uppercase mt-2 opacity-60">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= RIGHT SIDE (AI POWERED) ================= */}
{/* ================= RIGHT SIDE (AI POWERED) ================= */}
<div className="border border-black rounded-xl p-8 flex flex-col justify-between">

{/* ================= RIGHT SIDE (AI POWERED) ================= */}
<div className="space-y-8">


 <div className="flex space-x-4 mb-6">
  {["yesterday", "today", "week", "month"].map((tab) => (
    <button
      key={tab}
   onClick={() => {
  if (activeTab === tab) return;

  setActiveTab(tab);
  setSubmitted(false);
  setAnswers({});
  setInitialSummary(null);
  setInitialRisk(null);
}}
      className={`px-4 py-2 border rounded-md ${
        activeTab === tab
          ? "bg-black text-white"
          : "bg-white text-black"
      }`}
    >
      {tab.toUpperCase()}
    </button>
  ))}
</div>


  {/* ================= HEALTH SUMMARY ================= */}
  <div className="border border-black rounded-xl p-8">
    <h2 className="text-lg font-semibold mb-4">
      Health Summary
    </h2>

    {aiLoading && <p>Analyzing...</p>}

   {!aiLoading && (initialSummary || aiResult?.summary) && (
      <>
      <p className="leading-relaxed">
  {initialSummary || aiResult?.summary}
</p>
<p className="mt-4 font-semibold">
  Risk Level: {initialRisk || aiResult?.risk_level}
</p>
      </>
    )}
  </div>


  {/* ================= FOLLOW-UP FORM ================= */}
 


  {/* ================= FINAL RESULT ================= */}
 

</div>
</div>

</div>
{/* ================= SEPARATE FOLLOW-UP SECTION ================= */}
{activeTab !== "today" &&
  (aiResult?.follow_up_questions?.length > 0 || submitted) && (

  <div className="max-w-6xl mx-auto mt-16">
    <div className="border border-black rounded-xl p-10">

      {/* NAVIGATION */}
      <div className="flex space-x-6 mb-8 border-b border-black pb-3">
        <button
          onClick={() => setHistoryView("current")}
          className={`text-sm uppercase ${
            historyView === "current" ? "font-bold" : "opacity-50"
          }`}
        >
          Current
        </button>

        <button
          onClick={() => setHistoryView("history")}
          className={`text-sm uppercase ${
            historyView === "history" ? "font-bold" : "opacity-50"
          }`}
        >
          History
        </button>
      </div>

      {/* ================= CURRENT FOLLOW-UP ================= */}
    {historyView === "current" && (
  <>
    {!submitted && (
      <>
        <h2 className="text-xl font-semibold mb-8">
          Additional Information Required
        </h2>

        {aiResult.follow_up_questions.map((q, i) => (
          <div key={i} className="mb-6">
            <p className="mb-2 font-medium">{q}</p>
            <input
              className="border border-black p-3 w-full rounded-md"
              placeholder="Enter your answer..."
              onChange={(e) =>
                setAnswers({
                  ...answers,
                  [i]: e.target.value,
                })
              }
            />
          </div>
        ))}

        <button
          className="border border-black px-6 py-3 mt-6 rounded-md hover:bg-black hover:text-white transition"
          onClick={async () => {
  await getAI(activeTab, answers);   // generate final AI
  await finalizeAssessment();        // THEN save
}}
        >
          Generate Final Assessment
        </button>
      </>
    )}

    {submitted && (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">
          Final AI Health Assessment
        </h2>

        <p className="font-medium">
          Risk Level: {aiResult?.risk_level}
        </p>

        <p className="leading-relaxed">
          {aiResult?.final_assessment}
        </p>
{aiResult?.analysis && (
  <div className="mt-6 space-y-6">
    <div>
      <h3 className="font-semibold">Illness Detection</h3>
      <p>{aiResult.analysis.illness_detection}</p>
    </div>

    <div>
      <h3 className="font-semibold">Stress Tracking</h3>
      <p>{aiResult.analysis.stress_tracking}</p>
    </div>

    <div>
      <h3 className="font-semibold">Recovery</h3>
      <p>{aiResult.analysis.recovery}</p>
    </div>

    <div>
      <h3 className="font-semibold">Fitness Progress</h3>
      <p>{aiResult.analysis.fitness_progress}</p>
    </div>

    <div>
      <h3 className="font-semibold">Lifestyle Impact</h3>
      <p>{aiResult.analysis.lifestyle_impact}</p>
    </div>
  </div>
)}
        <div className="space-y-3 mt-6">
          {aiResult?.follow_up_questions?.map((q, i) => (
            <div key={i} className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-sm">{q}</p>
              <p className="text-xs opacity-70 mt-1">
                Answer: {answers[i] || "Not provided"}
              </p>
            </div>
          ))}
        </div>
      </div>
    )}
  </>
)}

      {/* ================= HISTORY VIEW ================= */}
      {historyView === "history" && (
        <div className="space-y-6">

          {history.length === 0 && (
            <p className="opacity-60 text-sm">
              No past assessments yet.
            </p>
          )}

       {history.map((item) => (
  <div
    key={item.id}
    className="border border-black rounded-lg p-6"
  >
    <div className="flex justify-between mb-4">
      <span className="uppercase text-xs font-semibold">
        {item.period}
      </span>
      <span className="text-xs opacity-60">
        {new Date(item.createdAt).toLocaleString()}
      </span>
    </div>

    <div className="mb-4">
      <p className="font-medium">
        Risk Level: {item.finalRisk || item.initialRisk}
      </p>

      <p className="text-sm mt-2 leading-relaxed">
        {item.finalAssessment || item.initialSummary}
      </p>
    </div>

    {item.followUpQuestions && (
      <div className="space-y-3">
        {item.followUpQuestions.map((q, i) => (
          <div key={i} className="bg-gray-50 p-3 rounded">
            <p className="font-medium text-sm">{q}</p>
            <p className="text-xs opacity-70 mt-1">
              Answer: {item.followUpAnswers?.[i] || "Not provided"}
            </p>
          </div>
        ))}
      </div>
    )}

    <div className="mt-4 text-xs opacity-60 break-words">
      Vitals Snapshot:{" "}
      {JSON.stringify(item.vitalsSnapshot)}
    </div>
  </div>
))}
        </div>
      )}

    </div>
  </div>
)}
      {/* ================= MODAL (UNCHANGED) ================= */}
      {activeMetric && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white text-black w-full max-w-2xl rounded-xl p-8">

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {activeMetric.label} Details
              </h3>
              <button
                onClick={() => setActiveMetric(null)}
                className="text-sm"
              >
                Close
              </button>
            </div>

            <div className="flex space-x-6 mb-8 border-b border-black pb-2">
              {["today", "week", "month"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`uppercase text-sm ${
                    activeTab === tab
                      ? "font-bold"
                      : "opacity-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "today" && (
              <div>
                <p className="text-3xl font-bold">
                  {activeMetric.value ?? "--"}
                </p>
                <p className="opacity-60 mt-2">
                  Today's {activeMetric.label}
                </p>
              </div>
            )}

            {activeTab === "week" && (
              <div className="space-y-3">
                {data?.weekly?.breakdown?.map(
                  (day, i) => {
                    let displayValue = "--";
                    
                    if (activeMetric.key === "blood_pressure") {
                      const sys = day.systolic_bp;
                      const dia = day.diastolic_bp;
                      displayValue = (sys || dia) ? `${sys ?? "--"}/${dia ?? "--"}` : "--";
                    } else {
                      displayValue = day[activeMetric.breakdownKey ?? activeMetric.key] ?? "--";
                    }
                    
                    return (
                      <div
                        key={i}
                        className="flex justify-between border-b border-black/20 pb-1"
                      >
                        <span>{day.date}</span>
                        <span>{displayValue}</span>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {activeTab === "month" && (
              <div>
                <p className="opacity-60">
                  Monthly data integration coming next.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
