"use client";
export default function ConnectGoogleFit() {
  return (
    <div>
      <button
        onClick={() => (window.location.href = "/api/google/login")}
        className="btn-primary"
      >
        Connect Google Fit
      </button>
    </div>
  );
}
