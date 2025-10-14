import { NextResponse } from "next/server";
import { getChatById, deleteChat } from "@/lib/chat-store";
import { checkBotId } from "botid/server";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: Params) {
  // 🔄 Real-time analysis mode - No chat history
  // Always return 404 to trigger frontend's empty state handling
  console.log("💡 Real-time mode: Chat history not available");
  
  return NextResponse.json(
    { error: "Chat not found - Real-time mode" },
    { status: 404 }
  );
  
  // Original database code (disabled)
  // try {
  //   const userId = request.headers.get('x-user-id');

  //   if (!userId) {
  //     return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  //   }

  //   const { id } = await params;
  //   const chat = await getChatById(id, userId);

  //   if (!chat) {
  //     return NextResponse.json(
  //       { error: "Chat not found" },
  //       { status: 404 }
  //     );
  //   }

  //   return NextResponse.json(chat);
  // } catch (error) {
  //   console.error("Error fetching chat:", error);
  //   return NextResponse.json(
  //     { error: "Failed to fetch chat" },
  //     { status: 500 }
  //   );
  // }
}

export async function DELETE(request: Request, { params }: Params) {
  // 🔄 Real-time analysis mode - No chat history to delete
  console.log("💡 Real-time mode: Delete operation skipped");
  
  return NextResponse.json({ success: true });
  
  // Original database code (disabled)
  // try {
  //   const userId = request.headers.get('x-user-id');

  //   if (!userId) {
  //     return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  //   }

  //   const { id } = await params;
  //   await deleteChat(id, userId);
  //   return NextResponse.json({ success: true });
  // } catch (error) {
  //   console.error("Error deleting chat:", error);
  //   return NextResponse.json(
  //     { error: "Failed to delete chat" },
  //     { status: 500 }
  //   );
  // }
} 