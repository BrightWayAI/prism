import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, invoices, userVendors } from "@prism/db";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete all invoices for this user
    const deletedInvoices = await db
      .delete(invoices)
      .where(eq(invoices.userId, session.user.id))
      .returning({ id: invoices.id });
    
    // Delete all user vendor associations
    const deletedVendors = await db
      .delete(userVendors)
      .where(eq(userVendors.userId, session.user.id))
      .returning({ id: userVendors.id });

    console.log(`Cleared data for user ${session.user.id}: ${deletedInvoices.length} invoices, ${deletedVendors.length} vendor associations`);

    return NextResponse.json({
      success: true,
      deletedInvoices: deletedInvoices.length,
      deletedVendors: deletedVendors.length,
    });
  } catch (error) {
    console.error("Error clearing data:", error);
    return NextResponse.json(
      { error: "Failed to clear data" },
      { status: 500 }
    );
  }
}
