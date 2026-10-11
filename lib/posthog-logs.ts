import { OpenTelemetry } from "@ai-sdk/otel";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PostHogSpanProcessor } from "@posthog/ai/otel";
import { registerTelemetry } from "ai";

function getPostHogConfig() {
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!projectToken) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
      );
    }
    return null;
  }

  if (!host) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
      );
    }
    return null;
  }

  return { projectToken, host };
}

const config = getPostHogConfig();
const posthogSpanProcessor = config
  ? new PostHogSpanProcessor({
      projectToken: config.projectToken,
      host: config.host,
    })
  : null;

const posthogLoggerProvider = config
  ? new LoggerProvider({
      resource: resourceFromAttributes({
        "service.name": "communication-analyzer",
      }),
      processors: [
        new BatchLogRecordProcessor(
          new OTLPLogExporter({
            url: new URL("/i/v1/logs", config.host).toString(),
            headers: {
              Authorization: `Bearer ${config.projectToken}`,
              "Content-Type": "application/json",
            },
          }),
        ),
      ],
    })
  : null;

if (posthogSpanProcessor) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": "communication-analyzer",
    }),
    spanProcessors: [posthogSpanProcessor],
  });
  sdk.start();

  registerTelemetry(
    new OpenTelemetry({
      enrichSpan: ({ runtimeContext }) => ({
        environment:
          typeof runtimeContext?.properties === "object" &&
          runtimeContext.properties !== null &&
          "environment" in runtimeContext.properties &&
          typeof runtimeContext.properties.environment === "string"
            ? runtimeContext.properties.environment
            : process.env.NODE_ENV,
      }),
    }),
  );
}

const logger = posthogLoggerProvider?.getLogger("posthog-log-exporter");

export async function flushAiObservability() {
  await posthogSpanProcessor?.forceFlush();
}

export async function flushPostHogLogs() {
  await posthogLoggerProvider?.forceFlush();
}

type WorkoutGenerationLogContext = {
  sourceSessionNumber: number;
  targetSessionNumber: number;
  workSessionCount: number;
};

export function logWorkoutGenerationStarted({
  sourceSessionNumber,
  targetSessionNumber,
  workSessionCount,
}: WorkoutGenerationLogContext) {
  logger?.emit({
    body: "workout_draft_generation_started",
    severityNumber: SeverityNumber.INFO,
    attributes: {
      route: "/api/admin/transcript-to-workout",
      source_session_number: sourceSessionNumber,
      target_session_number: targetSessionNumber,
      work_session_count: workSessionCount,
    },
  });
}

export function logWorkoutGenerationCompleted(
  context: WorkoutGenerationLogContext,
) {
  logger?.emit({
    body: "workout_draft_generation_completed",
    severityNumber: SeverityNumber.INFO,
    attributes: {
      route: "/api/admin/transcript-to-workout",
      source_session_number: context.sourceSessionNumber,
      target_session_number: context.targetSessionNumber,
      work_session_count: context.workSessionCount,
      outcome: "succeeded",
    },
  });
}

export function logWorkoutGenerationFailed(context: WorkoutGenerationLogContext) {
  logger?.emit({
    body: "workout_draft_generation_failed",
    severityNumber: SeverityNumber.ERROR,
    attributes: {
      route: "/api/admin/transcript-to-workout",
      source_session_number: context.sourceSessionNumber,
      target_session_number: context.targetSessionNumber,
      work_session_count: context.workSessionCount,
      outcome: "failed",
    },
  });
}
