use askama::Template;

pub mod content;
pub mod learn;
pub mod login;
pub mod me;
pub mod project;
pub mod resources;

#[derive(Template)]
#[template(path = "not_found.html")]
struct NotFoundTemplate<'a> {
    title: &'static str,
    active: &'static str,
    authenticated: bool,
    user_email: &'a str,
}

pub struct RenderedPage {
    pub status: u16,
    pub html: String,
}

fn render_not_found(user_email: Option<&str>) -> askama::Result<RenderedPage> {
    NotFoundTemplate {
        title: "页面不存在 — Rust 道场",
        active: "home",
        authenticated: user_email.is_some(),
        user_email: user_email.unwrap_or_default(),
    }
    .render()
    .map(|html| RenderedPage { status: 404, html })
}
