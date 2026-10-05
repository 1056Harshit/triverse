CREATE TABLE "legal_docs" (
	"id" text PRIMARY KEY NOT NULL,
	"doc" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legal_docs" ENABLE ROW LEVEL SECURITY;