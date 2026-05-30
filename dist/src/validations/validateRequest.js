import UnprocessableContentException from "../exceptions/unprocessableContentException.js";
export async function validateRequest(actionType, _reqData, _errorMessage) {
    throw new UnprocessableContentException(`Unknown validation action type: ${actionType}`);
}
