export function detectDeviation(current, baseline) {
  const sleepDrop = ((baseline.avgSleep - current.sleepHours) / baseline.avgSleep) * 100;
  const hrInc = ((current.heartRate - baseline.avgHR) / baseline.avgHR) * 100;
  const stepsDrop = ((baseline.avgSteps - current.steps) / baseline.avgSteps) * 100;

  const issues = [];

  if (sleepDrop > 20) issues.push("Sleep decreased");
  if (hrInc > 10) issues.push("Resting heart rate elevated");
  if (stepsDrop > 25) issues.push("Activity reduced");

  return issues.length ? { issues, level: "moderate" } : { issues: [], level: "normal" };
}
