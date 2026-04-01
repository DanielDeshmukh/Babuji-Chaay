import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// ✅ Use ANON KEY for auth validation
const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY  // ← This is the key change!
);

// ✅ Keep service role client for database operations (export for controllers)
export const supabaseServer = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        let token = null;

        // 1. Check for token in Authorization Header
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } 
        // 2. Fallback: Check for token in Query Parameters (For window.open / Invoices)
        else if (req.query.token) {
            token = req.query.token;
        }
        // 3. Fallback: Check HttpOnly auth cookie
        else if (req.cookies?.["sb-access-token"]) {
            token = req.cookies["sb-access-token"];
        }

        if (!token) {
            return res.status(401).json({ error: "Unauthorized: No token provided" });
        }

        // ✅ Use the ANON KEY client to verify the user token
        const { data, error } = await supabaseAuth.auth.getUser(token);

        if (error || !data?.user) {
            console.error("❌ Supabase auth error:", error?.message);
            return res.status(401).json({ error: "Unauthorized: Invalid token" });
        }

        req.userId = data.user.id;
        req.user = data.user; // Optional: attach full user object
        next();
    } catch (err) {
        console.error("💥 Auth middleware crash:", err);
        return res.status(401).json({ error: "Unauthorized" });
    }
};
