export function normalizeGoogleFitBuckets(data) {
  const logs = [];

  data.bucket.forEach((bucket) => {
    let steps = 0;
    let heartRate = null;

    bucket.dataset.forEach((dataset) => {
      dataset.point.forEach((point) => {
        if (dataset.dataSourceId.includes("step_count")) {
          steps += point.value[0]?.intVal || 0;
        }

        if (dataset.dataSourceId.includes("heart_rate")) {
          heartRate = point.value[0]?.fpVal || null;
        }
      });
    });

    logs.push({
      steps,
      heartRate,
      timestamp: new Date(parseInt(bucket.startTimeMillis)),
    });
  });

  return logs;
}
