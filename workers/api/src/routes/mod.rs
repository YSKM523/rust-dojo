pub mod ai;
pub mod auth;
pub mod progress;

use worker::{Context, Env, Method, Request, Response, Result};

pub async fn handle(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    match (req.method(), req.path().as_str()) {
        (Method::Post, "/api/auth/request-code") => auth::request_code(req, env).await,
        (Method::Post, "/api/auth/verify") => auth::verify(req, env).await,
        (Method::Get, "/api/auth/me") => auth::me(req, env).await,
        (Method::Post, "/api/auth/logout") => auth::logout(),
        (Method::Get, "/api/progress") => progress::list(req, env).await,
        (Method::Post, "/api/progress") => progress::upsert(req, env).await,
        (Method::Delete, "/api/progress") => progress::delete(req, env).await,
        (Method::Post, "/api/progress/sync") => progress::sync(req, env).await,
        (Method::Post, "/api/ai") => ai::ask(req, env).await,
        _ => json(404, serde_json::json!({ "error": "not found" })),
    }
}

pub(super) fn json(status: u16, value: serde_json::Value) -> Result<Response> {
    worker::ResponseBuilder::new()
        .with_status(status)
        .from_json(&value)
}

pub(super) fn now_ms() -> i64 {
    worker::Date::now().as_millis() as i64
}

pub(super) fn utc_day() -> String {
    worker::js_sys::Date::new_0()
        .to_iso_string()
        .as_string()
        .expect("Date#toISOString returns a string")[..10]
        .to_owned()
}

pub(super) fn env_string(env: &Env, binding: &str) -> Option<String> {
    env.var(binding)
        .ok()
        .map(|value| value.to_string())
        .filter(|value| !value.is_empty())
}

pub(super) fn trim_ecmascript(value: &str) -> &str {
    value.trim_matches(|character| {
        matches!(
            character,
            '\u{0009}'..='\u{000d}'
                | '\u{0020}'
                | '\u{00a0}'
                | '\u{1680}'
                | '\u{2000}'..='\u{200a}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202f}'
                | '\u{205f}'
                | '\u{3000}'
                | '\u{feff}'
        )
    })
}
