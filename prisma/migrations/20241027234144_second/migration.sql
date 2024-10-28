/*
  Warnings:

  - You are about to drop the column `stripePaymentIntentId` on the `Transaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[transactionReference]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Transaction_stripePaymentIntentId_key";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "stripePaymentIntentId",
ADD COLUMN     "transactionReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionReference_key" ON "Transaction"("transactionReference");
