-- CreateTable
CREATE TABLE "public"."HealthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "vitalsSnapshot" JSONB NOT NULL,
    "initialSummary" TEXT,
    "initialRisk" TEXT,
    "followUpQuestions" JSONB,
    "followUpAnswers" JSONB,
    "finalAssessment" TEXT,
    "finalRisk" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."HealthSession" ADD CONSTRAINT "HealthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
