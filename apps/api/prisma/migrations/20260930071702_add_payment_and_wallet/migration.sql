-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TESLAPAY');

-- AlterTable
ALTER TABLE "ride_requests" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "walletBalancePaisa" INTEGER NOT NULL DEFAULT 0;
