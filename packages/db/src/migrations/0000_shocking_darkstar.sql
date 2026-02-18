CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extraction_id" uuid NOT NULL,
	"agent_chain" varchar(255) NOT NULL,
	"reasoning_trace" text,
	"result_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_used" varchar(100) NOT NULL,
	"tokens_input" integer DEFAULT 0,
	"tokens_output" integer DEFAULT 0,
	"latency_ms" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"payload_before" jsonb,
	"payload_after" jsonb,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" text,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) DEFAULT 'application/pdf',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"pages" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"content_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"extraction_method" varchar(100) DEFAULT 'docling+pdfplumber+gemini' NOT NULL,
	"raw_text" text,
	"tables_count" integer DEFAULT 0,
	"images_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"entity_type" text NOT NULL,
	"content" text,
	"embedding" vector(1536),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"weight" integer DEFAULT 1,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "precedents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"category" varchar(50) NOT NULL,
	"source" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_key" varchar(100) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prompt_versions_key_version" UNIQUE("prompt_key","version")
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_extraction_id_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."extractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_relations" ADD CONSTRAINT "graph_relations_source_id_graph_entities_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."graph_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_relations" ADD CONSTRAINT "graph_relations_target_id_graph_entities_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."graph_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_analyses_extraction_id" ON "analyses" USING btree ("extraction_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_documents_user_id" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_documents_status" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_extractions_document_id" ON "extractions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_graph_entities_type" ON "graph_entities" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "idx_graph_entities_name" ON "graph_entities" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_graph_relations_source" ON "graph_relations" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_graph_relations_target" ON "graph_relations" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "idx_graph_relations_type" ON "graph_relations" USING btree ("relation_type");--> statement-breakpoint
CREATE INDEX "idx_precedents_category" ON "precedents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_prompt_versions_key_active" ON "prompt_versions" USING btree ("prompt_key","is_active");