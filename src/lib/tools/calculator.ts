import { ToolExecutionResult } from '../types';

export class CalculatorTool {
  public static execute(inputQuery: string): ToolExecutionResult | null {
    try {
      // Extract math expression
      // e.g. "hitung 125 * 384 + 1928 / 4"
      const mathClean = inputQuery
        .replace(/^[^\d\(\)\-\+]*/, '')
        .replace(/[^\d\+\-\*\/\^\%\(\)\.\s]/g, '')
        .trim();

      if (!mathClean || !/\d/.test(mathClean)) {
        return null;
      }

      // Safe evaluation without eval
      // Replace power operator
      const sanitized = mathClean.replace(/\^/g, '**');

      // Validate allowed tokens only
      if (!/^[\d\s\+\-\*\/\(\)\.\%]+$/.test(sanitized)) {
        return null;
      }

      // Safe Function constructor with strict sandbox
      const fn = new Function(`"use strict"; return (${sanitized});`);
      const result = fn();

      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        return null;
      }

      return {
        toolName: 'Calculator Tool',
        input: mathClean,
        output: String(result),
      };
    } catch {
      return null;
    }
  }
}

