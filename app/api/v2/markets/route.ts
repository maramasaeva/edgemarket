import { NextRequest } from "next/server";
import { requirePayment } from "@/lib/x402";

// Re-export the original handler logic
import { GET as freeGET } from "@/app/api/markets/route";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const paymentResponse = await requirePayment(req);
  if (paymentResponse) return paymentResponse;
  return freeGET();
}
