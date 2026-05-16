process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/bewithme_test';
process.env.JWT_SECRET ??= 'test-secret-do-not-use-in-production-min-32-chars';
process.env.MUX_TOKEN_ID ??= 'test-mux-token-id';
process.env.MUX_TOKEN_SECRET ??= 'test-mux-token-secret';
process.env.MUX_WEBHOOK_SECRET ??= 'test-mux-webhook-secret';
