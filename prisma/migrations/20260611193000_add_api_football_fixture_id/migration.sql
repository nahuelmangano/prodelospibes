ALTER TABLE "Match" ADD COLUMN "apiFootballFixtureId" INTEGER;

CREATE UNIQUE INDEX "Match_apiFootballFixtureId_key" ON "Match"("apiFootballFixtureId");
