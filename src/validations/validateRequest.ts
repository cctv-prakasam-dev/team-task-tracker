import UnprocessableContentException from "../exceptions/unprocessableContentException";
import { AppActivity, ValidatedRequest } from "../types/app.types";

export async function validateRequest<R extends ValidatedRequest>(
  actionType: AppActivity,
  reqData: any,
  errorMessage: string,
) {
  let schema;

  switch (actionType) {
    default:
      throw new Error(`Unknown validation action type: ${actionType}`);
  }

  const validation = await safeParseAsync(schema!, reqData, {
    abortPipeEarly: true,
  });

  if (!validation.success) {
    throw new UnprocessableContentException(
      errorMessage,
      flatten(validation.issues).nested,
    );
  }

  return validation.output as R;
}
