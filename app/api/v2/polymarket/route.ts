import { NextRequest } from "next/server";
import { requirePayment } from "@/lib/x402";

import { GET as freeGET, POST as freePOST } from "@/app/api/polymarket/route";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const paymentResponse = await requirePayment(req);
  if (paymentResponse) return paymentResponse;
  return freeGET(req);
}

export async function POST(req: NextRequest) {
  const paymentResponse = await requirePayment(req);
  if (paymentResponse) return paymentResponse;
  return freePOST(req);
}
