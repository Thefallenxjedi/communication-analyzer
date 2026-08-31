/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analyses from "../analyses.js";
import type * as coaching from "../coaching.js";
import type * as coachingProgram from "../coachingProgram.js";
import type * as coachingSessions from "../coachingSessions.js";
import type * as crons from "../crons.js";
import type * as demoSeed from "../demoSeed.js";
import type * as diagnosisCorePrompt from "../diagnosisCorePrompt.js";
import type * as estimateAnalysisDuration from "../estimateAnalysisDuration.js";
import type * as introCall from "../introCall.js";
import type * as promptAddOns from "../promptAddOns.js";
import type * as reports from "../reports.js";
import type * as surveys from "../surveys.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analyses: typeof analyses;
  coaching: typeof coaching;
  coachingProgram: typeof coachingProgram;
  coachingSessions: typeof coachingSessions;
  crons: typeof crons;
  demoSeed: typeof demoSeed;
  diagnosisCorePrompt: typeof diagnosisCorePrompt;
  estimateAnalysisDuration: typeof estimateAnalysisDuration;
  introCall: typeof introCall;
  promptAddOns: typeof promptAddOns;
  reports: typeof reports;
  surveys: typeof surveys;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
