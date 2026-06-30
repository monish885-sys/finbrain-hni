import { demoData } from "@capstone/demo-data";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(demoData);
}
