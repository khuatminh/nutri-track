-- NFR-09: idempotency keys for saves retried after a lost connection / lost response.
ALTER TABLE "food_logs" ADD COLUMN "client_request_id" TEXT;
ALTER TABLE "water_logs" ADD COLUMN "client_request_id" TEXT;

CREATE UNIQUE INDEX "food_logs_user_id_client_request_id_key" ON "food_logs"("user_id", "client_request_id");
CREATE UNIQUE INDEX "water_logs_user_id_client_request_id_key" ON "water_logs"("user_id", "client_request_id");
