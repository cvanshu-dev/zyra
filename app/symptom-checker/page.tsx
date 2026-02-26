"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function SymptomCheckerPage() {
  const [symptoms, setSymptoms] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheck() {
    if (!symptoms.trim()) {
      setError("Please enter your symptoms first.");
      return;
    }
    if (symptoms.length > 1000) {
      setError("Please keep it under 1000 characters.");
      return;
    }

    setError("");
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: symptoms }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Unknown error");
      setResponse(data.text);
    } catch (err: any) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">AI Symptom Checker</h1>

      <Textarea
        rows={5}
        placeholder="Describe your symptoms here..."
        value={symptoms}
        onChange={(e) => setSymptoms(e.target.value)}
        className="border border-gray-300 rounded-md p-3 w-full focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
      />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <Button
        variant="default"
        size="default"
        onClick={handleCheck}
        disabled={loading}
        className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin mr-2 h-4 w-4" /> Checking...
          </>
        ) : (
          "Check Symptoms"
        )}
      </Button>

      {response && (
        <div className="mt-4 p-3 bg-black text-white rounded-md whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-700">
          {response}
        </div>
      )}
    </div>
  );
}
