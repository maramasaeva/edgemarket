import { NextRequest } from "next/server";
import { requirePayment } from "@/lib/x402";

import { GET as freeGET } from "@/app/api/fear-greed/route";

export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const paymentResponse = await requirePayment(req);
  if (paymentResponse) return paymentResponse;
  return freeGET();
}
