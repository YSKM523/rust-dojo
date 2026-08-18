pub mod ai;
pub mod auth;
pub mod progress;

use worker::{Context, Env, Method, Request, Response, Result};

use crate::pages::{self, RenderedPage};

type PageHandler = fn(&str, Option<&str>) -> askama::Result<RenderedPage>;

const PAGE_ROUTES: [(&str, PageHandler); 7] = [
    ("/login", pages::login::render_page),
    ("/me", pages::me::render_page),
    ("/exercise", pages::exercise::render_page),
    ("/learn", pages::learn::render_page),
    ("/project/", pages::project::render_page),
    ("/resources", pages::resources::render_page),
    ("/", pages::home::render_page),
];

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
        (Method::Get | Method::Head, path) if path != "/api" && !path.starts_with("/api/") => {
            let email = session_email(&req, &env);
            let render = page_handler(path);
            let page = render(path, email.as_deref())
                .map_err(|error| worker::Error::RustError(error.to_string()))?;
            html(page.status, page.html)
        }
        _ => json(404, serde_json::json!({ "error": "not found" })),
    }
}

fn page_handler(path: &str) -> PageHandler {
    PAGE_ROUTES
        .iter()
        .find(|(prefix, _)| {
            if *prefix == "/" {
                path == "/"
            } else if prefix.ends_with('/') {
                path.starts_with(prefix)
            } else {
                path == *prefix
                    || path
                        .strip_prefix(prefix)
                        .is_some_and(|suffix| suffix.starts_with('/'))
            }
        })
        .map(|(_, handler)| *handler)
        .unwrap_or(pages::home::render_page)
}

fn session_email(req: &Request, env: &Env) -> Option<String> {
    let secret = env_string(env, "SESSION_SECRET")?;
    auth::read_session(req, &secret).map(|session| session.email)
}

fn html(status: u16, page: String) -> Result<Response> {
    worker::ResponseBuilder::new()
        .with_status(status)
        .with_header("Cache-Control", "private, no-store")?
        .with_header("Vary", "Cookie")?
        .from_html(page)
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
    crate::core::code::trim_ecmascript(value)
}
