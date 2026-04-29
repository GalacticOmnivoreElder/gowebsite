import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();

    const isAdmin = !!(
      decodedToken.admin === true ||
      userData?.admin === true
    );

    if (!isAdmin) {
      return Response.json({ error: "Not an admin" }, { status: 403 });
    }

    return Response.json({ isAdmin: true });
  } catch (error) {
    console.error("Admin check error:", error);
    return Response.json({ error: "Authentication failed" }, { status: 401 });
  }
}
