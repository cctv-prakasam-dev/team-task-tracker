import type { AppActivity, ValidatedRequest } from "../types/app.types.js";

import UnprocessableContentException from "../exceptions/unprocessableContentException.js";

export async function validateRequest<R extends ValidatedRequest>(
  actionType: AppActivity,
  _reqData: any,
  _errorMessage: string,
): Promise<R> {
  throw new UnprocessableContentException(`Unknown validation action type: ${actionType}`);
}
