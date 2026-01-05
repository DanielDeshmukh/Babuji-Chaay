import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config(); // MUST be before createClient

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data?.user) {
            console.error("Supabase auth error:", error);
            return res.status(401).json({ error: "Unauthorized" });
        }

        const payload = JSON.parse(
            Buffer.from(token.split(".")[1], "base64").toString()
        );
        console.log("JWT PAYLOAD:", payload);


        req.userId = data.user.id;
        next();
    } catch (err) {
        console.error("Auth middleware crash:", err);
        return res.status(401).json({ error: "Unauthorized" });
    }
};
