use askama::Template;

use super::{render_not_found, RenderedPage};

const PAGE_TITLE: &str = "Rust 道场 — 从零到后端实战";

#[derive(Template)]
#[template(path = "login.html")]
struct LoginTemplate<'a> {
    title: &'static str,
    active: &'static str,
    authenticated: bool,
    user_email: &'a str,
}

pub fn render(user_email: Option<&str>) -> askama::Result<String> {
    LoginTemplate {
        title: PAGE_TITLE,
        // Topbar.tsx has no active predicate for /login.
        active: "login",
        authenticated: user_email.is_some(),
        user_email: user_email.unwrap_or_default(),
    }
    .render()
}

pub fn render_page(path: &str, user_email: Option<&str>) -> askama::Result<RenderedPage> {
    let Some(suffix) = path.strip_prefix("/login") else {
        return render_not_found(user_email);
    };
    if !matches!(suffix, "" | "/") {
        return render_not_found(user_email);
    }
    render(user_email).map(|html| RenderedPage { status: 200, html })
}
