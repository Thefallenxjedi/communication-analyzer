export function posthogAiTelemetry(functionId: string) {
  return {
    isEnabled: true,
    functionId,
    // Vercel AI SDK v7 uses these telemetry options as its privacy controls.
    recordInputs: true,
    recordOutputs: true,
  };
}
