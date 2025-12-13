import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectServicesInInbox } from "@/lib/gmail";

export async function POST() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const detectedServices = await detectServicesInInbox(session.user.id);
    
    return NextResponse.json({
      services: detectedServices.map((s) => ({
        id: s.vendor.id,
        name: s.vendor.name,
        slug: s.vendor.slug,
        logoUrl: s.vendor.logoUrl,
        category: s.vendor.category,
        emailCount: s.emailCount,
      })),
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Failed to scan inbox" },
      { status: 500 }
    );
  }
}
