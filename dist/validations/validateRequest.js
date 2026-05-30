import UnprocessableContentException from "../exceptions/unprocessableContentException";
export async function validateRequest(actionType, reqData, errorMessage) {
    let schema;
    switch (actionType) {
        default:
            throw new Error(`Unknown validation action type: ${actionType}`);
    }
    const validation = await safeParseAsync(schema, reqData, {
        abortPipeEarly: true,
    });
    if (!validation.success) {
        throw new UnprocessableContentException(errorMessage, flatten(validation.issues).nested);
    }
    return validation.output;
}
