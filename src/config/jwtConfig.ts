
export const jwtConfig = {
  secret: process.env.JWT_SECRET!,
  expires_in: 60 * 60 * 24 * 30!, // 30 days
};
