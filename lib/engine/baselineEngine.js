export function buildBaseline(logs) {
  const sleep = logs.map((d) => d.sleepHours).filter(Boolean);
  const hr = logs.map((d) => d.heartRate).filter(Boolean);
  const steps = logs.map((d) => d.steps).filter(Boolean);

  const avgSleep = sleep.reduce((a,b) => a+b, 0) / sleep.length;
  const avgHR = hr.reduce((a,b) => a+b, 0) / hr.length;
  const avgSteps = steps.reduce((a,b) => a+b, 0) / steps.length;

  return { avgSleep, avgHR, avgSteps };
}
