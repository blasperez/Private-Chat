"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
// Only create the client if we have valid credentials
exports.supabase = (supabaseUrl && supabaseKey)
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey)
    : null;
